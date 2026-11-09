// Skill mastery: exponentially weighted success rate with a half-life of about 20 observations.
export interface SkillRow { skill: string; value: number; count: number; }

export const HALF_LIFE = 20;
const ALPHA = 1 - Math.pow(0.5, 1 / HALF_LIFE);
export const LEVELS = ['Bago', 'Natututo', 'Kaya na', 'Sanay', 'Bihasa'] as const;

export function observe(row: SkillRow | undefined, skill: string, success: boolean): SkillRow {
  const prev = row ?? { skill, value: 0.5, count: 0 };
  return { skill, value: prev.value * (1 - ALPHA) + (success ? ALPHA : 0), count: prev.count + 1 };
}

/** 0 = Bago … 4 = Bihasa. Needs both a high success rate and enough observations. */
export function level(row: SkillRow | undefined): number {
  if (!row || row.count < 3) return 0;
  if (row.value < 0.6) return 1;
  if (row.value < 0.75) return 2;
  if (row.value < 0.88 || row.count < 20) return 3;
  return 4;
}

/** The n weakest skills that have enough observations to judge. */
export function weakest(rows: SkillRow[], n = 2): string[] {
  return rows
    .filter((r) => r.count >= 3 && !r.skill.startsWith('vocab_'))
    .sort((a, b) => a.value - b.value || b.count - a.count)
    .slice(0, n)
    .map((r) => r.skill);
}
