// Glue between the database and the pure logic, plus a tiny "re-run queries after a write" hook.
import { useEffect, useState } from 'react';
import { applyOverrides, baseContent, isSchedulable } from '../content/loader';
import type { Content } from '../content/types';
import { db, type RecordingKind, type RecordingRow } from '../db/dexie';
import { dayKey, emptyDay, goalReached, initialStreak, markGoalMet, reconcile, type DayRow, type StreakState } from '../progress/streak';
import type { Recorded } from '../speech/recorder';
import { newCard, review, type Rating } from '../srs/fsrs';
import { observe, weakest } from '../srs/mastery';
import { buildSession, type Step } from '../srs/sessionBuilder';

let version = 0;
const listeners = new Set<() => void>();
export function bump(): void {
  version++;
  listeners.forEach((l) => l());
}

/** Runs an async query and re-runs it whenever data was written (bump) or deps change. */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [value, setValue] = useState<T>();
  const [v, setV] = useState(version);
  useEffect(() => {
    const l = (): void => setV(version);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  useEffect(() => {
    let live = true;
    void fn().then((r) => { if (live) setValue(r); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, ...deps]);
  return value;
}

export const loadContent = async (): Promise<Content> => applyOverrides(baseContent, await db.overrides.toArray());
export const getDay = async (day = dayKey()): Promise<DayRow> => (await db.days.get(day)) ?? emptyDay(day);

async function budget(content: Content): Promise<{ dueLeft: number; newLeft: number; reviewsLeft: number }> {
  const today = dayKey();
  const s = await db.settings();
  const units = new Map(content.units.map((u) => [u.id, u]));
  const ok = new Set(content.items.filter((it) => isSchedulable(it, units.get(it.unitId)) && it.type !== 'shadow').map((it) => it.id));
  const cards = await db.cards.toArray();
  const due = cards.filter((c) => ok.has(c.id) && dayKey(new Date(c.card.due)) <= today).length;
  const done = await db.reviews.where('day').equals(today).toArray();
  const reviewsLeft = Math.max(0, s.maxReviews - done.filter((r) => !r.isNew).length);
  const newLeft = due > s.maxReviews ? 0 : Math.max(0, s.newPerDay - done.filter((r) => r.isNew).length);
  return { dueLeft: Math.min(due, reviewsLeft), newLeft, reviewsLeft };
}
export const dueLeft = async (content: Content): Promise<number> => (await budget(content)).dueLeft;

export async function referenceIds(): Promise<Set<string>> {
  const keys = await db.recordings.where('[kind+refId]').between(['reference', ''], ['reference', '￿']).keys();
  return new Set(keys.map((k) => (k as unknown as [string, string])[1]));
}

export async function planSession(content: Content, minutes: 5 | 10 | 15): Promise<Step[]> {
  const [b, cards, skills, speakIndex, audioIds] = await Promise.all([
    budget(content), db.cards.toArray(), db.skills.toArray(), db.get('speakIndex', 0), referenceIds(),
  ]);
  return buildSession({
    content, minutes, today: dayKey(), cards: new Map(cards.map((c) => [c.id, c.card])),
    newLeft: b.newLeft, reviewsLeft: b.reviewsLeft, weakSkills: weakest(skills), speakIndex, audioIds,
  });
}

export interface AnswerInput {
  refId: string;
  kind: 'item' | 'prompt';
  rating: Rating;
  checks: Record<string, boolean>; // skill → ticked as correct
  isNew: boolean;
  extra?: boolean; // extra practice: mastery only, no FSRS update
  rubric?: number[];
}

export async function recordAnswer(a: AnswerInput): Promise<void> {
  const now = new Date();
  const day = dayKey(now);
  const { retention } = await db.settings();
  await db.transaction('rw', db.cards, db.reviews, db.skills, db.days, async () => {
    if (!a.extra) {
      const row = await db.cards.get(a.refId);
      await db.cards.put({ id: a.refId, kind: a.kind, card: review(row?.card ?? newCard(now), a.rating, now, retention) });
      await db.reviews.add({ refId: a.refId, ts: now.getTime(), day, rating: a.rating, isNew: a.isNew && !row, ...(a.rubric ? { rubric: a.rubric } : {}) });
    }
    for (const [skill, ok] of Object.entries(a.checks)) await db.skills.put(observe(await db.skills.get(skill), skill, ok));
    const d = (await db.days.get(day)) ?? emptyDay(day);
    await db.days.put({ ...d, reviews: d.reviews + 1 });
  });
  bump();
}

export async function addTime(activeSec: number, speak?: { task: string; sec: number }): Promise<void> {
  const d = await getDay();
  const speakSec = speak ? { ...d.speakSec, [speak.task]: (d.speakSec[speak.task] ?? 0) + speak.sec } : d.speakSec;
  await db.days.put({ ...d, activeSec: d.activeSec + Math.round(activeSec), speakSec });
  bump();
}

/** Reconciles missed days and marks today's goal once it is reached. */
export async function updateStreak(content: Content): Promise<StreakState> {
  const today = dayKey();
  let streak = reconcile(await db.get('streak', initialStreak), today);
  const d = await getDay(today);
  if (!d.goalMet && goalReached(d, await dueLeft(content))) {
    await db.days.put({ ...d, goalMet: true });
    streak = markGoalMet(streak, today);
  }
  await db.set('streak', streak);
  bump();
  return streak;
}

export async function saveRecording(refId: string, kind: RecordingKind, rec: Recorded): Promise<number> {
  const data = await rec.blob.arrayBuffer();
  if (kind === 'reference') await db.recordings.where('[kind+refId]').equals(['reference', refId]).delete();
  const id = await db.recordings.add({ refId, kind, ts: Date.now(), durationSec: rec.durationSec, mimeType: rec.mimeType, data, starred: false });
  await pruneRecordings();
  bump();
  return id;
}

export const KEEP_PER_ITEM = 3;
export const KEEP_RETELL_DAYS = 30;
/**
 * Retention: the latest 3 practice takes per item, 4/3/2 rounds from the last 30 days, and anything
 * starred. Reference recordings are never pruned. "aggressive" keeps only the latest practice take.
 */
export async function pruneRecordings(aggressive = false): Promise<number> {
  const rows: Pick<RecordingRow, 'id' | 'refId' | 'kind' | 'ts' | 'starred'>[] = [];
  await db.recordings.orderBy('ts').reverse().each((r) => { rows.push({ id: r.id, refId: r.refId, kind: r.kind, ts: r.ts, starred: r.starred }); });
  const cutoff = Date.now() - KEEP_RETELL_DAYS * 86_400_000;
  const seen = new Map<string, number>();
  const drop: number[] = [];
  for (const r of rows) {
    if (r.starred || r.kind === 'reference') continue;
    if (r.kind === 'retell') { if (r.ts < cutoff) drop.push(r.id!); continue; }
    const n = (seen.get(r.refId) ?? 0) + 1;
    seen.set(r.refId, n);
    if (n > (aggressive ? 1 : KEEP_PER_ITEM)) drop.push(r.id!);
  }
  await db.recordings.bulkDelete(drop);
  if (drop.length) bump();
  return drop.length;
}

export const recordingBlob = (r: RecordingRow): Blob => new Blob([r.data], { type: r.mimeType });

/** Model audio for an item: the user's reference recording first, then a bundled file, else none. */
export async function modelAudio(id: string, bundled?: string): Promise<Blob | string | undefined> {
  const ref = await db.recordings.where('[kind+refId]').equals(['reference', id]).last();
  if (ref) return recordingBlob(ref);
  return bundled ? `${import.meta.env.BASE_URL}${bundled.replace(/^\//, '')}` : undefined;
}
