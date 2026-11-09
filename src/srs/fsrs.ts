// Thin wrapper around ts-fsrs. Cards are stored with ISO date strings so they are JSON-safe.
import { createEmptyCard, fsrs, generatorParameters, type Card, type Grade } from 'ts-fsrs';

export type Rating = 1 | 2 | 3 | 4; // Again / Hard / Good / Easy
export const RATING_LABELS = ['Again', 'Hard', 'Good', 'Easy'] as const;

export interface StoredCard {
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  learning_steps: number;
  state: number;
  last_review?: string;
}

const toCard = (c: StoredCard): Card =>
  ({ ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined }) as Card;

const toStored = (c: Card): StoredCard => ({
  due: new Date(c.due).toISOString(),
  stability: c.stability,
  difficulty: c.difficulty,
  scheduled_days: c.scheduled_days,
  reps: c.reps,
  lapses: c.lapses,
  learning_steps: c.learning_steps,
  state: c.state as number,
  last_review: c.last_review ? new Date(c.last_review).toISOString() : undefined,
});

export const newCard = (now: Date): StoredCard => toStored(createEmptyCard(now));

/**
 * Applies a rating. Short-term (minute-level) learning steps are off: this is a once-a-day app,
 * so every review schedules the card at least one day ahead. Fuzz is off to keep it predictable.
 */
export function review(card: StoredCard, rating: Rating, now: Date, retention = 0.9): StoredCard {
  const scheduler = fsrs(generatorParameters({ request_retention: retention, enable_short_term: false, enable_fuzz: false }));
  return toStored(scheduler.next(toCard(card), now, rating as Grade).card);
}

/** Speaking rubric (four scores, 1–4 each) → FSRS rating. */
export function rubricToRating(scores: number[]): Rating {
  const avg = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
  return avg < 1.75 ? 1 : avg < 2.5 ? 2 : avg < 3.5 ? 3 : 4;
}
