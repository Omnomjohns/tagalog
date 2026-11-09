// Builds the "Today" loop: warm-up retrieval → pattern drill → speaking task → spaced review wrap-up.
import { isSchedulable } from '../content/loader';
import type { Content, Item, SpeakingPrompt } from '../content/types';
import { dayKey } from '../progress/streak';
import type { StoredCard } from './fsrs';

export type Phase = 'warmup' | 'drill' | 'speak' | 'wrap';
export interface Step {
  phase: Phase;
  kind: 'item' | 'prompt';
  id: string;
  isNew: boolean;
  /** Extra practice on a card that is not due: counts for mastery, does not touch FSRS. */
  extra?: boolean;
}
export interface BuildInput {
  content: Content;
  cards: Map<string, StoredCard>;
  today: string;
  minutes: 5 | 10 | 15;
  newLeft: number; // new cards still allowed today
  reviewsLeft: number; // due reviews still allowed today
  weakSkills: string[];
  speakIndex: number; // number of speaking tasks done so far; rotates the task type
  audioIds: Set<string>; // items that have reference audio (needed for shadowing)
}

const SIZES = {
  5: { warm: 5, drill: 6, wrap: 6, shadow: 3 },
  10: { warm: 6, drill: 8, wrap: 10, shadow: 4 },
  15: { warm: 8, drill: 10, wrap: 16, shadow: 5 },
} as const;
export const MAX_RECOGNIZE_SHARE = 0.1;

const isDue = (card: StoredCard | undefined, today: string): boolean => !!card && dayKey(new Date(card.due)) <= today;

export function buildSession(input: BuildInput): Step[] {
  const { content, cards, today, weakSkills, audioIds } = input;
  const size = SIZES[input.minutes];
  const units = new Map(content.units.map((u) => [u.id, u]));
  const order = (id: string): number => units.get(id)?.order ?? 99;
  const hasAudio = (it: Item): boolean => audioIds.has(it.id) || !!it.answers[0]?.audio;

  const items = content.items
    .filter((it) => isSchedulable(it, units.get(it.unitId)) && (it.type !== 'shadow' || hasAudio(it)))
    .sort((a, b) => order(a.unitId) - order(b.unitId));
  const due = items.filter((it) => isDue(cards.get(it.id), today))
    .sort((a, b) => cards.get(a.id)!.due.localeCompare(cards.get(b.id)!.due));
  const fresh = items.filter((it) => !cards.has(it.id));
  const seen = items.filter((it) => cards.has(it.id) && !isDue(cards.get(it.id), today));

  const used = new Set<string>();
  let newLeft = Math.max(0, input.newLeft);
  let reviewsLeft = Math.max(0, input.reviewsLeft);
  const steps: Step[] = [];

  const take = (phase: Phase, pool: Item[], n: number, mode: 'due' | 'new' | 'extra', ok: (it: Item) => boolean = () => true): number => {
    let taken = 0;
    for (const it of pool) {
      if (taken >= n) break;
      if (used.has(it.id) || !ok(it)) continue;
      if (mode === 'due' && reviewsLeft <= 0) break;
      if (mode === 'new' && newLeft <= 0) break;
      if (mode === 'due') reviewsLeft--;
      if (mode === 'new') newLeft--;
      used.add(it.id);
      steps.push({ phase, kind: 'item', id: it.id, isNew: mode === 'new', ...(mode === 'extra' ? { extra: true } : {}) });
      taken++;
    }
    return taken;
  };

  // 1. Warm-up retrieval: due production cards, topped up with new ones.
  const production = (it: Item): boolean => it.type === 'produce' || it.type === 'chunkbuild';
  let n = take('warmup', due, size.warm, 'due', production);
  take('warmup', fresh, Math.min(size.warm - n, Math.ceil(newLeft / 2)), 'new', production); // keep new cards for the drill

  // 2. Pattern drill: transformations, biased to the two weakest skills (deliberate practice).
  const currentUnit = fresh[0]?.unitId ?? due[0]?.unitId ?? items[0]?.unitId;
  const targets = weakSkills.length ? weakSkills : (units.get(currentUnit ?? '')?.skills ?? []);
  const onTarget = (it: Item): boolean => it.skills.some((s) => targets.includes(s));
  const transform = (it: Item): boolean => it.type === 'transform';
  n = 0;
  n += take('drill', due, size.drill - n, 'due', (it) => transform(it) && onTarget(it));
  n += take('drill', fresh, size.drill - n, 'new', (it) => transform(it) && onTarget(it));
  n += take('drill', seen, size.drill - n, 'extra', (it) => transform(it) && onTarget(it));
  n += take('drill', due, size.drill - n, 'due', transform);
  n += take('drill', fresh, size.drill - n, 'new', transform);
  n += take('drill', seen, size.drill - n, 'extra', (it) => onTarget(it) && it.type !== 'shadow' && it.type !== 'recognize');
  interleave(steps, 'drill', (id) => content.items.find((it) => it.id === id)?.skills[0] ?? '');

  // 3. Speaking task: rotate prompted output → 4/3/2 retell → shadowing.
  const shadowPool = [...due, ...fresh, ...seen].filter((it) => it.type === 'shadow' && !used.has(it.id));
  let mode = input.speakIndex % 3;
  if (mode === 2 && shadowPool.length < 2) mode = 0;
  if (mode === 2) {
    for (const it of shadowPool.slice(0, size.shadow)) {
      used.add(it.id);
      const isNew = !cards.has(it.id);
      steps.push({ phase: 'speak', kind: 'item', id: it.id, isNew, ...(isNew || isDue(cards.get(it.id), today) ? {} : { extra: true }) });
    }
  } else {
    const prompt = pickPrompt(content, cards, today, mode === 1, order);
    if (prompt) steps.push({ phase: 'speak', kind: 'prompt', id: prompt.id, isNew: !cards.has(prompt.id) });
  }

  // 4. Spaced review wrap-up: the remaining due cards, then new cards while the limit allows.
  const wrapOk = (it: Item): boolean => it.type !== 'shadow' && it.type !== 'recognize';
  n = take('wrap', due, size.wrap, 'due', wrapOk);
  take('wrap', fresh, size.wrap - n, 'new', wrapOk);

  // Recognition warm-ups: only to introduce new material, never more than 10% of the session.
  const allowed = Math.min(newLeft, Math.floor((steps.length * MAX_RECOGNIZE_SHARE) / (1 - MAX_RECOGNIZE_SHARE)));
  const recog = fresh.filter((it) => it.type === 'recognize' && !used.has(it.id) && it.unitId === currentUnit).slice(0, allowed);
  steps.unshift(...recog.map((it): Step => ({ phase: 'warmup', kind: 'item', id: it.id, isNew: true })));
  return steps;
}

function pickPrompt(content: Content, cards: Map<string, StoredCard>, today: string, retell: boolean,
  order: (unitId: string) => number): SpeakingPrompt | undefined {
  const units = new Map(content.units.map((u) => [u.id, u]));
  const pool = content.prompts
    .filter((p) => isSchedulable(p, units.get(p.unitId)) && p.kind !== 'narrate' && (p.kind === 'retell432') === retell)
    .sort((a, b) => order(a.unitId) - order(b.unitId));
  return pool.find((p) => isDue(cards.get(p.id), today))
    ?? pool.find((p) => !cards.has(p.id))
    ?? [...pool].sort((a, b) => cards.get(a.id)!.due.localeCompare(cards.get(b.id)!.due))[0];
}

/** Reorders one phase so neighbouring items train different skills where possible. */
function interleave(steps: Step[], phase: Phase, key: (id: string) => string): void {
  const idx = steps.map((s, i) => (s.phase === phase ? i : -1)).filter((i) => i >= 0);
  const groups = new Map<string, Step[]>();
  for (const i of idx) {
    const k = key(steps[i]!.id);
    groups.set(k, [...(groups.get(k) ?? []), steps[i]!]);
  }
  const queues = [...groups.values()];
  const out: Step[] = [];
  while (out.length < idx.length) for (const q of queues) { const s = q.shift(); if (s) out.push(s); }
  idx.forEach((i, j) => { steps[i] = out[j]!; });
}

export const recognizeShare = (steps: Step[], content: Content): number => {
  const types = new Map(content.items.map((it) => [it.id, it.type]));
  return steps.length ? steps.filter((s) => types.get(s.id) === 'recognize').length / steps.length : 0;
};
