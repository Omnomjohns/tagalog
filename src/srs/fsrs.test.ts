import { describe, expect, it } from 'vitest';
import { newCard, review, rubricToRating, type Rating } from './fsrs';

const now = new Date('2026-01-10T10:00:00Z');
const days = (iso: string): number => (Date.parse(iso) - now.getTime()) / 86_400_000;

describe('fsrs wrapper', () => {
  it('creates a new card that is due immediately and is JSON-safe', () => {
    const c = newCard(now);
    expect(c.due).toBe(now.toISOString());
    expect(c.reps).toBe(0);
    expect(JSON.parse(JSON.stringify(c))).toEqual(JSON.parse(JSON.stringify(c)));
  });

  it('schedules every rating at least one day ahead (no minute-level steps)', () => {
    for (const r of [1, 2, 3, 4] as Rating[]) {
      const c = review(newCard(now), r, now);
      expect(days(c.due)).toBeGreaterThanOrEqual(1);
      expect(c.reps).toBe(1);
      expect(c.last_review).toBe(now.toISOString());
    }
  });

  it('orders intervals Again <= Hard <= Good <= Easy', () => {
    const [again, hard, good, easy] = ([1, 2, 3, 4] as Rating[]).map((r) => days(review(newCard(now), r, now).due));
    expect(again!).toBeLessThanOrEqual(hard!);
    expect(hard!).toBeLessThanOrEqual(good!);
    expect(good!).toBeLessThan(easy!);
  });

  it('grows the interval on repeated Good and counts a lapse on Again', () => {
    let c = review(newCard(now), 3, now);
    const first = c.scheduled_days;
    c = review(c, 3, new Date(c.due));
    expect(c.scheduled_days).toBeGreaterThan(first);
    const lapsed = review(c, 1, new Date(c.due));
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.scheduled_days).toBeLessThan(c.scheduled_days);
  });

  it('gives shorter intervals for a higher desired retention', () => {
    const at = (ret: number): number => {
      let c = review(newCard(now), 3, now, ret);
      c = review(c, 3, new Date(c.due), ret);
      return c.scheduled_days;
    };
    expect(at(0.95)).toBeLessThan(at(0.8));
  });

  it('maps the speaking rubric average to a rating', () => {
    expect(rubricToRating([1, 1, 2, 1])).toBe(1);
    expect(rubricToRating([2, 2, 3, 2])).toBe(2);
    expect(rubricToRating([3, 3, 3, 3])).toBe(3);
    expect(rubricToRating([4, 4, 4, 3])).toBe(4);
  });
});
