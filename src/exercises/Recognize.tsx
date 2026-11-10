import { useMemo, useState, type ReactElement } from 'react';
import { modelAudio, useQuery } from '../app/store';
import { play } from '../speech/player';
import type { ItemProps } from './ProduceSentence';

/** Recognition warm-up (max 10% of a session): read or hear the Tagalog, pick the meaning, then say it. */
export function Recognize({ item, onDone, distractors }: ItemProps & { distractors: string[] }): ReactElement {
  const [picked, setPicked] = useState<string>();
  const model = useQuery(() => modelAudio(item.id, item.answers[0]?.audio), [item.id]);
  const options = useMemo(() => {
    const all = [item.cueEn, ...distractors.slice(0, 2)];
    const shift = item.id.charCodeAt(item.id.length - 1) % all.length;
    return [...all.slice(shift), ...all.slice(0, shift)];
  }, [item, distractors]);

  return (
    <>
      <div className="grow scroll stack">
        <div className="card stack">
          <h3>New: what does it mean?</h3>
          <p className="tl">{item.answers[0]?.tl}</p>
          {model && <button className="btn sm" onClick={() => void play(model)}>▶ Listen</button>}
        </div>
        <div className="stack options">
          {options.map((o) => (
            <button key={o} className={`btn block ${picked ? (o === item.cueEn ? 'right' : o === picked ? 'wrong' : '') : ''}`}
              disabled={!!picked} onClick={() => setPicked(o)}>{o}</button>
          ))}
        </div>
        {picked && <p className="muted">Now say the Tagalog sentence aloud once.</p>}
      </div>
      <button className="btn primary block" disabled={!picked}
        onClick={() => onDone({ rating: picked === item.cueEn ? 3 : 1, checks: {}, speakSec: 0 })}>Continue</button>
    </>
  );
}
