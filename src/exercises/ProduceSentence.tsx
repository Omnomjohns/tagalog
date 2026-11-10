import { useState, type ReactElement } from 'react';
import { modelAudio, saveRecording, useQuery } from '../app/store';
import type { Item, Register } from '../content/types';
import type { Settings } from '../db/dexie';
import type { Recorded } from '../speech/recorder';
import type { Rating } from '../srs/fsrs';
import { RecordButton } from '../ui/RecordButton';
import { AudioCompare, Checklist, emptyChecks, RatingBar, type Checks } from '../ui/Review';
import { ChunkCue } from './ChunkBuild';
import { TransformCue } from './Transform';

export interface ExerciseResult { rating: Rating; checks: Checks; rubric?: number[]; speakSec: number; }
export interface ItemProps { item: Item; settings: Settings; onDone: (r: ExerciseResult) => void; }

export const cueText = (item: Item, lang: Settings['cueLang']): string =>
  lang === 'de' && item.cueDe ? item.cueDe : lang === 'both' && item.cueDe ? `${item.cueEn}\n${item.cueDe}` : item.cueEn;

const REGISTER: Record<Register, string | null> = { neutral: null, polite: 'polite', casual: 'casual' };

export function ModelAnswers({ item }: { item: Item }): ReactElement {
  return (
    <div className="card stack">
      <div className="row between">
        <h3>Model answer</h3>
        {item.review !== 'approved' && <span className="badge amber">unreviewed</span>}
      </div>
      {item.answers.map((a) => (
        <p key={a.tl} className="tl">{a.tl} {REGISTER[a.register] && <span className="badge teal">{REGISTER[a.register]}</span>}</p>
      ))}
      {item.gloss && <details><summary>Grammar note</summary><p className="muted">{item.gloss}</p></details>}
    </div>
  );
}

/** ProduceSentence, Transform and ChunkBuild: cue → say it aloud (optionally recorded) → reveal → check → rate. */
export function ProduceSentence({ item, settings, onDone }: ItemProps): ReactElement {
  const [revealed, setRevealed] = useState(false);
  const [mine, setMine] = useState<Recorded>();
  const [checks, setChecks] = useState<Checks>(() => emptyChecks(item.skills));
  const model = useQuery(() => modelAudio(item.id, item.answers[0]?.audio), [item.id]);
  const cue = cueText(item, settings.cueLang);

  const recorded = (rec: Recorded): void => {
    setMine(rec);
    setRevealed(true);
    void saveRecording(item.id, 'practice', rec);
  };

  return (
    <>
      <div className="grow scroll stack">
        <div className="card stack">
          {item.type === 'transform' ? <TransformCue item={item} />
            : item.type === 'chunkbuild' ? <ChunkCue item={item} cue={cue} />
            : <><h3>Say it in Tagalog</h3><p style={{ fontSize: 19, whiteSpace: 'pre-line' }}>{cue}</p></>}
        </div>
        {revealed && (
          <>
            <ModelAnswers item={item} />
            <AudioCompare mine={mine?.blob} model={model} />
            <Checklist skills={item.skills} checks={checks} onChange={setChecks} />
          </>
        )}
      </div>
      {revealed ? (
        <RatingBar onRate={(rating) => onDone({ rating, checks, speakSec: mine?.durationSec ?? 0 })} />
      ) : (
        <div className="stack center">
          <RecordButton small onDone={recorded} maxSec={60} label="Record (optional)" />
          <button className="btn primary block" onClick={() => setRevealed(true)}>I said it — show answer</button>
        </div>
      )}
    </>
  );
}
