import { describe, expect, it } from 'vitest';
import { baseContent } from '../content/loader';
import type { Content, Item } from '../content/types';
import { newCard, review, type StoredCard } from './fsrs';
import { buildSession, recognizeShare, type BuildInput } from './sessionBuilder';

const today = '2026-02-01';
const base = (over: Partial<BuildInput> = {}): BuildInput => ({
  content: baseContent, cards: new Map(), today, minutes: 10, newLeft: 10, reviewsLeft: 60,
  weakSkills: [], speakIndex: 0, audioIds: new Set(), ...over,
});
const itemOf = (id: string): Item => baseContent.items.find((it) => it.id === id)!;
const dueCard = (): StoredCard => review(newCard(new Date('2026-01-20T10:00:00Z')), 3, new Date('2026-01-20T10:00:00Z'));
const laterCard = (): StoredCard => ({ ...dueCard(), due: '2026-03-01T10:00:00.000Z' });

describe('session builder', () => {
  it('builds all four phases in order', () => {
    const steps = buildSession(base({ newLeft: 30 }));
    const phases = steps.map((s) => s.phase);
    expect(new Set(phases)).toEqual(new Set(['warmup', 'drill', 'speak', 'wrap']));
    expect(phases.join(',')).toMatch(/^(warmup,)+(drill,)+(speak,)+(wrap,?)*$/);
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
  });

  it('never exceeds 10% recognition items, for every session length and day state', () => {
    for (const minutes of [5, 10, 15] as const) {
      for (const newLeft of [0, 3, 10, 50]) {
        const steps = buildSession(base({ minutes, newLeft }));
        expect(recognizeShare(steps, baseContent)).toBeLessThanOrEqual(0.1);
      }
    }
  });

  it('never schedules rejected, draft or unreviewed low-confidence content', () => {
    const content: Content = {
      ...baseContent,
      items: baseContent.items.map((it, i) => (i % 3 === 0 ? { ...it, review: 'rejected' } : i % 3 === 1 ? { ...it, confidence: 'low' } : it)),
    };
    const ids = new Set(buildSession(base({ content, minutes: 15, newLeft: 99 })).filter((s) => s.kind === 'item').map((s) => s.id));
    for (const it of content.items) {
      if (ids.has(it.id)) {
        expect(it.review).not.toBe('rejected');
        expect(it.confidence).not.toBe('low');
        expect(it.unitId <= 'u03').toBe(true);
      }
    }
  });

  it('schedules approved low-confidence content', () => {
    const content: Content = { ...baseContent, items: baseContent.items.map((it) => ({ ...it, confidence: 'low', review: 'approved' })) };
    expect(buildSession(base({ content })).some((s) => s.kind === 'item')).toBe(true);
  });

  it('splits a small new-card budget between warm-up and drill', () => {
    const steps = buildSession(base({ newLeft: 10 }));
    expect(steps.filter((s) => s.phase === 'warmup' && s.isNew).length).toBeGreaterThanOrEqual(4);
    expect(steps.filter((s) => s.phase === 'drill' && s.isNew).length).toBeGreaterThanOrEqual(4);
  });

  it('respects the new-card limit', () => {
    expect(buildSession(base({ newLeft: 4 })).filter((s) => s.kind === 'item' && s.isNew).length).toBe(4);
    expect(buildSession(base({ newLeft: 0 })).filter((s) => s.kind === 'item').length).toBe(0);
  });

  it('puts due cards before new ones and respects the review limit', () => {
    const produce = baseContent.items.filter((it) => it.type === 'produce' && it.unitId === 'u01').slice(0, 20);
    const cards = new Map(produce.map((it) => [it.id, dueCard()]));
    const steps = buildSession(base({ cards, newLeft: 0 }));
    expect(steps.filter((s) => s.kind === 'item').length).toBe(16); // 6 warm-up + 10 wrap-up
    expect(steps.filter((s) => s.kind === 'item').every((s) => !s.isNew && cards.has(s.id))).toBe(true);
    expect(buildSession(base({ cards, newLeft: 0, reviewsLeft: 5 })).filter((s) => s.kind === 'item').length).toBe(5);
  });

  it('biases the pattern drill to the weakest skills', () => {
    const drill = buildSession(base({ weakSkills: ['enclitics', 'politeness'] })).filter((s) => s.phase === 'drill');
    expect(drill.length).toBeGreaterThan(0);
    const onTarget = drill.filter((s) => itemOf(s.id).skills.some((k) => k === 'enclitics' || k === 'politeness'));
    expect(onTarget.length).toBeGreaterThanOrEqual(Math.min(drill.length, 4));
    expect(itemOf(drill[0]!.id).skills.some((k) => k === 'enclitics' || k === 'politeness')).toBe(true);
  });

  it('marks drill items that are not due as extra practice', () => {
    const transforms = baseContent.items.filter((it) => it.type === 'transform' && it.unitId <= 'u03');
    const cards = new Map(transforms.map((it) => [it.id, laterCard()]));
    const drill = buildSession(base({ cards })).filter((s) => s.phase === 'drill');
    expect(drill.length).toBeGreaterThan(0);
    expect(drill.every((s) => s.extra && !s.isNew)).toBe(true);
  });

  it('rotates the speaking task and only shadows items that have audio', () => {
    const kindOf = (speakIndex: number, audioIds = new Set<string>()) => {
      const s = buildSession(base({ speakIndex, audioIds })).filter((x) => x.phase === 'speak');
      return s[0]!.kind === 'prompt' ? baseContent.prompts.find((p) => p.id === s[0]!.id)!.kind : 'shadow';
    };
    expect(kindOf(0)).not.toBe('retell432');
    expect(kindOf(1)).toBe('retell432');
    expect(kindOf(2)).not.toBe('shadow'); // no reference audio yet → falls back to a prompt
    const shadows = baseContent.items.filter((it) => it.type === 'shadow').slice(0, 4).map((it) => it.id);
    expect(kindOf(2, new Set(shadows))).toBe('shadow');
    const all = buildSession(base({ speakIndex: 0 }));
    expect(all.some((s) => s.kind === 'item' && itemOf(s.id).type === 'shadow')).toBe(false);
  });

  it('scales with the session length', () => {
    const len = (minutes: 5 | 10 | 15) => buildSession(base({ minutes, newLeft: 99 })).length;
    expect(len(5)).toBeLessThan(len(10));
    expect(len(10)).toBeLessThan(len(15));
  });
});
