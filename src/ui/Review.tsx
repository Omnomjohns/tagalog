// Shared pieces of the "after you spoke" step: audio compare, checklist, rating, rubric.
import { useEffect, useState, type ReactElement } from 'react';
import { checklistRows } from '../content/loader';
import type { Skill } from '../content/types';
import { play, playSequence, stopPlayback, type AudioSource } from '../speech/player';
import { RATING_LABELS, type Rating } from '../srs/fsrs';

export function AudioCompare({ mine, model }: { mine?: AudioSource; model?: AudioSource }): ReactElement | null {
  useEffect(() => stopPlayback, []);
  if (!mine && !model) return null;
  return (
    <div className="row wrap">
      {mine && <button className="btn sm" onClick={() => void play(mine)}>▶ Mine</button>}
      {model && <button className="btn sm" onClick={() => void play(model)}>▶ Model</button>}
      {mine && model && <button className="btn sm" onClick={() => void playSequence([mine, model])}>A–B</button>}
    </div>
  );
}

export type Checks = Record<string, boolean>;

/** The learner ticks what was correct. Unticked rows count against that skill. */
export function Checklist({ skills, checks, onChange }: { skills: Skill[]; checks: Checks; onChange: (c: Checks) => void }): ReactElement {
  const rows = checklistRows(skills);
  const all = rows.every((r) => checks[r.skill]);
  return (
    <div className="card stack" style={{ gap: 2 }}>
      <div className="row between">
        <h3>What was correct?</h3>
        <button className="link small" onClick={() => onChange(Object.fromEntries(rows.map((r) => [r.skill, !all])))}>{all ? 'Clear' : 'All correct'}</button>
      </div>
      {rows.map((r) => (
        <button key={r.skill} className="check" aria-pressed={!!checks[r.skill]} onClick={() => onChange({ ...checks, [r.skill]: !checks[r.skill] })}>
          <b aria-hidden="true">✓</b>{r.label}
        </button>
      ))}
    </div>
  );
}

export const emptyChecks = (skills: Skill[]): Checks => Object.fromEntries(checklistRows(skills).map((r) => [r.skill, false]));

export function RatingBar({ onRate }: { onRate: (r: Rating) => void }): ReactElement {
  return (
    <div className="ratings" role="group" aria-label="Rate yourself">
      {RATING_LABELS.map((label, i) => (
        <button key={label} className={`btn ${label.toLowerCase()}`} onClick={() => onRate((i + 1) as Rating)}>{label}</button>
      ))}
    </div>
  );
}

export const RUBRIC = [
  ['Fluency', 'few long pauses'],
  ['Grammar', 'focus, aspect, enclitics'],
  ['Range', 'used the chunks and connectors'],
  ['Filipino only', 'no English fallback'],
] as const;

export function Rubric({ onDone }: { onDone: (scores: number[]) => void }): ReactElement {
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0]);
  return (
    <div className="stack">
      {RUBRIC.map(([name, hint], i) => (
        <div key={name}>
          <div className="row between small"><b>{name}</b><span className="muted">{hint}</span></div>
          <div className="scale" role="group" aria-label={`${name}, 1 to 4`}>
            {[1, 2, 3, 4].map((n) => (
              <button key={n} aria-pressed={scores[i] === n} onClick={() => setScores(scores.map((s, j) => (j === i ? n : s)))}>{n}</button>
            ))}
          </div>
        </div>
      ))}
      <button className="btn primary block" disabled={scores.includes(0)} onClick={() => onDone(scores)}>Save and continue</button>
    </div>
  );
}
