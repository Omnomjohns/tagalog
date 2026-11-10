import { useState, type ReactElement } from 'react';
import { modelAudio, saveRecording, useQuery } from '../app/store';
import { play } from '../speech/player';
import type { Recorded } from '../speech/recorder';
import { RecordButton } from '../ui/RecordButton';
import { AudioCompare, Checklist, emptyChecks, RatingBar, type Checks } from '../ui/Review';
import type { ItemProps } from './ProduceSentence';

/** Shadowing: listen to the model, imitate it straight away, then compare A-B. */
export function Shadow({ item, onDone }: ItemProps): ReactElement {
  const [heard, setHeard] = useState(false);
  const [mine, setMine] = useState<Recorded>();
  const [checks, setChecks] = useState<Checks>(() => emptyChecks(item.skills));
  const model = useQuery(() => modelAudio(item.id, item.answers[0]?.audio), [item.id]);

  return (
    <>
      <div className="grow scroll stack">
        <div className="card stack">
          <h3>Shadow: listen, then imitate</h3>
          <p className="tl">{item.answers[0]?.tl}</p>
          <p className="muted">{item.cueEn}</p>
        </div>
        {mine && (
          <>
            <AudioCompare mine={mine.blob} model={model} />
            <Checklist skills={item.skills} checks={checks} onChange={setChecks} />
          </>
        )}
      </div>
      {mine ? (
        <RatingBar onRate={(rating) => onDone({ rating, checks, speakSec: mine.durationSec })} />
      ) : (
        <div className="stack center">
          <button className="btn block" disabled={!model} onClick={() => { setHeard(true); if (model) void play(model); }}>▶ Listen to the model</button>
          {heard && <RecordButton maxSec={30} onDone={(rec) => { setMine(rec); void saveRecording(item.id, 'practice', rec); }} label="Record your imitation" />}
        </div>
      )}
    </>
  );
}
