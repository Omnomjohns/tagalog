import { useState, type ReactElement } from 'react';
import { saveRecording } from '../app/store';
import { FILIPINO_ONLY } from '../content/loader';
import type { SpeakingPrompt } from '../content/types';
import type { Settings } from '../db/dexie';
import type { Recorded } from '../speech/recorder';
import { rubricToRating } from '../srs/fsrs';
import { RecordButton } from '../ui/RecordButton';
import { AudioCompare, Rubric, type Checks } from '../ui/Review';
import type { ExerciseResult } from './ProduceSentence';

export interface PromptProps { prompt: SpeakingPrompt; settings: Settings; onDone: (r: ExerciseResult) => void; }

/** Rubric → result. Grammar ≥ 3 counts as a success for the prompt's skills. */
export function rubricResult(prompt: SpeakingPrompt, rubric: number[], speakSec: number): ExerciseResult {
  const checks: Checks = Object.fromEntries(prompt.skills.map((s) => [s, rubric[1]! >= 3]));
  checks[FILIPINO_ONLY] = rubric[3]! >= 3;
  return { rating: rubricToRating(rubric), checks, rubric, speakSec };
}

export function PromptCard({ prompt, label }: { prompt: SpeakingPrompt; label: string }): ReactElement {
  return (
    <div className="card stack">
      <div className="row between"><h3>{label}</h3>{prompt.review !== 'approved' && <span className="badge amber">unreviewed</span>}</div>
      <p style={{ fontSize: 18 }}>{prompt.promptEn}</p>
      <div className="row wrap">{prompt.requiredChunks.map((c) => <span key={c} className="chip">{c}</span>)}</div>
    </div>
  );
}

export function ModelDetails({ prompt }: { prompt: SpeakingPrompt }): ReactElement {
  return <details className="card"><summary>Show a model answer</summary><p className="tl">{prompt.modelAnswer.tl}</p></details>;
}

/** Prompted output: a situation, opinion or story card with required chunks. Recorded, scored with the rubric. */
export function SpeakTask({ prompt, onDone }: PromptProps): ReactElement {
  const [mine, setMine] = useState<Recorded>();
  const [skipped, setSkipped] = useState(false);
  const reviewing = !!mine || skipped;

  return (
    <>
      <div className="grow scroll stack">
        <PromptCard prompt={prompt} label={`Speak for about ${prompt.targetSeconds} s`} />
        {reviewing && (
          <>
            <div className="row between">
              <AudioCompare mine={mine?.blob} />
              <button className="link" onClick={() => { setMine(undefined); setSkipped(false); }}>Try again</button>
            </div>
            <ModelDetails prompt={prompt} />
            <Rubric onDone={(rubric) => onDone(rubricResult(prompt, rubric, mine?.durationSec ?? 0))} />
          </>
        )}
      </div>
      {!reviewing && (
        <div className="stack center">
          <RecordButton maxSec={120} onDone={(rec) => { setMine(rec); void saveRecording(prompt.id, 'practice', rec); }} label="Tap to record" />
          <button className="link" onClick={() => setSkipped(true)}>I spoke without recording</button>
        </div>
      )}
    </>
  );
}
