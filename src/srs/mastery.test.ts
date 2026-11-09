import { describe, expect, it } from 'vitest';
import { HALF_LIFE, level, observe, weakest, type SkillRow } from './mastery';

const run = (results: boolean[], start?: SkillRow): SkillRow =>
  results.reduce<SkillRow | undefined>((row, ok) => observe(row, 'aspect', ok), start)!;

describe('mastery', () => {
  it('starts at 0.5 and counts observations', () => {
    const r = observe(undefined, 'aspect', true);
    expect(r.count).toBe(1);
    expect(r.value).toBeGreaterThan(0.5);
    expect(observe(undefined, 'aspect', false).value).toBeLessThan(0.5);
  });

  it('has a half-life of about 20 observations', () => {
    const r = run(Array(HALF_LIFE).fill(true));
    expect(r.value).toBeCloseTo(0.75, 5); // half of the distance from 0.5 to 1
  });

  it('weights recent observations more than old ones', () => {
    const improving = run([...Array(10).fill(false), ...Array(10).fill(true)]);
    const declining = run([...Array(10).fill(true), ...Array(10).fill(false)]);
    expect(improving.value).toBeGreaterThan(declining.value);
  });

  it('maps to five levels and needs enough observations for the top one', () => {
    expect(level(undefined)).toBe(0);
    expect(level({ skill: 'x', value: 0.9, count: 2 })).toBe(0);
    expect(level({ skill: 'x', value: 0.4, count: 10 })).toBe(1);
    expect(level({ skill: 'x', value: 0.7, count: 10 })).toBe(2);
    expect(level({ skill: 'x', value: 0.95, count: 10 })).toBe(3);
    expect(level({ skill: 'x', value: 0.95, count: 40 })).toBe(4);
  });

  it('returns the two weakest judged skills, ignoring unjudged and vocab skills', () => {
    const rows: SkillRow[] = [
      { skill: 'aspect', value: 0.4, count: 10 }, { skill: 'linker', value: 0.8, count: 10 },
      { skill: 'enclitics', value: 0.3, count: 10 }, { skill: 'markers', value: 0.1, count: 1 },
      { skill: 'vocab_filipino_only', value: 0.1, count: 10 },
    ];
    expect(weakest(rows)).toEqual(['enclitics', 'aspect']);
  });
});
