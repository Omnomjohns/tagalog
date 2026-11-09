import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { newCard, review } from '../srs/fsrs';
import { observe } from '../srs/mastery';
import { exportData, importData, validateBackup } from './backup';
import { SalitaDB, SCHEMA_VERSION } from './dexie';

let db: SalitaDB;
let n = 0;
const now = new Date('2026-01-10T10:00:00Z');

async function seed(d: SalitaDB): Promise<void> {
  await d.cards.bulkPut([
    { id: 'u01-i001', kind: 'item', card: review(newCard(now), 3, now) },
    { id: 'u01-p01', kind: 'prompt', card: review(newCard(now), 2, now) },
  ]);
  await d.reviews.bulkAdd([
    { refId: 'u01-i001', ts: now.getTime(), day: '2026-01-10', rating: 3, isNew: true },
    { refId: 'u01-p01', ts: now.getTime(), day: '2026-01-10', rating: 2, isNew: true, rubric: [2, 3, 2, 2] },
  ]);
  await d.skills.put(observe(undefined, 'aspect', true));
  await d.days.put({ day: '2026-01-10', speakSec: { speak: 75 }, activeSec: 400, reviews: 2, goalMet: false });
  await d.retells.add({ promptId: 'u01-p06', ts: now.getTime(), day: '2026-01-10', rounds: [{ limitSec: 90, durationSec: 88, words: 120 }] });
  await d.overrides.put({ id: 'u01-i002', review: 'approved', answers: ['May dalawa akong kapatid.'], ts: now.getTime() });
  await d.set('settings', { sessionMinutes: 15, theme: 'dark' });
  await d.set('streak', { current: 4, best: 9, freezes: 1, lastDay: '2026-01-10', frozenDays: [] });
  await d.recordings.add({ refId: 'u01-i001', kind: 'practice', ts: now.getTime(), durationSec: 5, mimeType: 'audio/mp4', data: new ArrayBuffer(8), starred: false });
}

beforeEach(() => { db = new SalitaDB(`test-${n++}`); });

describe('backup', () => {
  it('round-trips: export → wipe → import restores everything except recordings', async () => {
    await seed(db);
    const before = await exportData(db, now);
    const json = JSON.stringify(before);

    await db.delete();
    db = new SalitaDB(`test-${n++}`);
    expect(await db.cards.count()).toBe(0);

    const result = validateBackup(JSON.parse(json));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    await importData(db, result.backup);

    const after = await exportData(db, now);
    expect(after).toEqual(before);
    expect(after.schemaVersion).toBe(SCHEMA_VERSION);
    expect((await db.settings()).sessionMinutes).toBe(15);
    expect(await db.recordings.count()).toBe(0);
    expect(json).not.toContain('"recordings"');
  });

  it('replaces existing progress but keeps recordings on the device', async () => {
    await seed(db);
    const backup = await exportData(db, now);
    await db.cards.put({ id: 'extra', kind: 'item', card: newCard(now) });
    await importData(db, backup);
    expect(await db.cards.get('extra')).toBeUndefined();
    expect(await db.cards.count()).toBe(2);
    expect(await db.recordings.count()).toBe(1);
  });

  it('rejects files that are not valid backups', async () => {
    await seed(db);
    const good = JSON.parse(JSON.stringify(await exportData(db, now)));
    const bad = (change: (b: any) => void) => { const b = structuredClone(good); change(b); return validateBackup(b); };
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup({ app: 'other' }).ok).toBe(false);
    expect(bad((b) => { b.schemaVersion = SCHEMA_VERSION + 1; }).ok).toBe(false);
    expect(bad((b) => { delete b.data.cards; }).ok).toBe(false);
    expect(bad((b) => { b.data.cards[0].card.due = 'not a date'; }).ok).toBe(false);
    expect(bad((b) => { b.data.skills = [{ nope: 1 }]; }).ok).toBe(false);
    expect(validateBackup(good).ok).toBe(true);
  });
});
