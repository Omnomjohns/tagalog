// Days, streak, freezes and the daily goal. A day ends at local midnight in Europe/Berlin.
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' });

export const dayKey = (d: Date = new Date()): string => fmt.format(d);

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

export interface DayRow { day: string; speakSec: Record<string, number>; activeSec: number; reviews: number; goalMet: boolean; }
export const emptyDay = (day: string): DayRow => ({ day, speakSec: {}, activeSec: 0, reviews: 0, goalMet: false });
export const speakTotal = (d: DayRow | undefined): number => Object.values(d?.speakSec ?? {}).reduce((a, b) => a + b, 0);

export const GOAL_SPEAK_SEC = 180;
export const GOAL_ACTIVE_SEC = 600;
/** Goal: 3 min of recorded speaking and all due reviews done, or 10 min of practice in total. */
export const goalReached = (d: DayRow, dueLeft: number): boolean =>
  (speakTotal(d) >= GOAL_SPEAK_SEC && dueLeft === 0) || d.activeSec >= GOAL_ACTIVE_SEC;

export interface StreakState { current: number; best: number; freezes: number; lastDay: string | null; frozenDays: string[]; }
export const MAX_FREEZES = 2;
export const initialStreak: StreakState = { current: 0, best: 0, freezes: MAX_FREEZES, lastDay: null, frozenDays: [] };

/** Call when the app opens: missed days are covered by freeze tokens, otherwise the streak resets. */
export function reconcile(s: StreakState, today: string): StreakState {
  if (!s.lastDay || s.current === 0) return s;
  const missed = daysBetween(s.lastDay, today) - 1;
  if (missed <= 0) return s;
  if (missed > s.freezes) return { ...s, current: 0 };
  const frozen = Array.from({ length: missed }, (_, i) => addDays(s.lastDay!, i + 1));
  return { ...s, freezes: s.freezes - missed, lastDay: addDays(today, -1), frozenDays: [...s.frozenDays, ...frozen].slice(-60) };
}

/** Call when today's goal is met. Every 7th streak day earns a freeze token (max 2). */
export function markGoalMet(s: StreakState, today: string): StreakState {
  if (s.lastDay === today) return s;
  const current = s.current + 1;
  const freezes = current % 7 === 0 ? Math.min(MAX_FREEZES, s.freezes + 1) : s.freezes;
  return { ...s, current, best: Math.max(s.best, current), freezes, lastDay: today };
}
