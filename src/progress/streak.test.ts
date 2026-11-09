import { describe, expect, it } from 'vitest';
import { addDays, dayKey, daysBetween, emptyDay, goalReached, initialStreak, markGoalMet, reconcile } from './streak';

describe('days', () => {
  it('uses Europe/Berlin midnight as the day boundary', () => {
    expect(dayKey(new Date('2026-01-10T22:30:00Z'))).toBe('2026-01-10'); // 23:30 in Berlin (winter)
    expect(dayKey(new Date('2026-01-10T23:30:00Z'))).toBe('2026-01-11'); // 00:30 in Berlin
    expect(dayKey(new Date('2026-07-10T22:30:00Z'))).toBe('2026-07-11'); // 00:30 in Berlin (summer)
  });
  it('adds days across month and DST boundaries', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });
});

describe('daily goal', () => {
  it('needs 3 min of speaking with no reviews left, or 10 min in total', () => {
    const d = { ...emptyDay('2026-01-10'), speakSec: { speak: 120, retell: 70 } };
    expect(goalReached(d, 0)).toBe(true);
    expect(goalReached(d, 3)).toBe(false);
    expect(goalReached({ ...emptyDay('2026-01-10'), activeSec: 600 }, 9)).toBe(true);
    expect(goalReached(emptyDay('2026-01-10'), 0)).toBe(false);
  });
});

describe('streak', () => {
  const streakOf = (n: number, start = '2026-01-01') =>
    Array.from({ length: n }, (_, i) => addDays(start, i)).reduce(markGoalMet, initialStreak);

  it('counts consecutive days once per day', () => {
    const s = streakOf(3);
    expect(s.current).toBe(3);
    expect(markGoalMet(s, '2026-01-03').current).toBe(3);
  });
  it('starts with 2 freezes and never holds more than 2', () => {
    expect(initialStreak.freezes).toBe(2);
    expect(streakOf(14).freezes).toBe(2);
  });
  it('spends a freeze for a missed day and keeps the streak', () => {
    const s = reconcile(streakOf(3), '2026-01-05'); // missed Jan 4
    expect(s.current).toBe(3);
    expect(s.freezes).toBe(1);
    expect(s.frozenDays).toEqual(['2026-01-04']);
    expect(markGoalMet(s, '2026-01-05').current).toBe(4);
  });
  it('earns a freeze back on a 7-day streak', () => {
    let s = reconcile(streakOf(3), '2026-01-05');
    for (let i = 0; i < 4; i++) s = markGoalMet(s, addDays('2026-01-05', i));
    expect(s.current).toBe(7);
    expect(s.freezes).toBe(2);
  });
  it('resets when more days were missed than freezes are left', () => {
    const s = reconcile(streakOf(5), '2026-01-09'); // missed 3 days
    expect(s.current).toBe(0);
    expect(s.best).toBe(5);
  });
  it('does nothing when no day was missed', () => {
    const s = streakOf(3);
    expect(reconcile(s, '2026-01-04')).toEqual(s);
    expect(reconcile(s, '2026-01-03')).toEqual(s);
  });
});
