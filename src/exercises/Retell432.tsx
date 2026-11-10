import { useState, type ReactElement } from 'react';
import { saveRecording } from '../app/store';
import { db, type RetellRound } from '../db/dexie';
import { dayKey } from '../progress/streak';
import { play } from '../speech/player';
import type { Recorded } from '../speech/recorder';
import { fmtTime } from '../ui/Bits';
import { RecordButton } from '../ui/RecordButton';
import { Rubric } from '../ui/Review';
import { ModelDetails, PromptCard, rubricResult, type PromptProps } from './SpeakTask';

export const wpm = (r: RetellRound): number | undefined => (r.words ? Math.round((r.words / r.durationSec) * 60) : undefined);

/** 4/3/2 retell: the same topic three times with a shrinking time limit. Fluency through repetition. */
export function Retell432({ prompt, settings, onDone }: PromptProps): ReactElement {
  const limits = settings.retellSeconds;
  const [takes, setTakes] = useState<Recorded[]>([]);
  const [words, setWords] = useState<string[]>(['', '', '']);
  const [round, setRound] = useState(0); // index of the round being recorded or reviewed
  const take = takes[round];
  const finished = round >= limits.length;
  const rounds: RetellRound[] = takes.map((t, i) => ({ limitSec: limits[i]!, durationSec: t.durationSec, ...(Number(words[i]) > 0 ? { words: Number(words[i]) } : {}) }));

  const finish = async (rubric: number[]): Promise<void> => {
    await db.retells.add({ promptId: prompt.id, ts: Date.now(), day: dayKey(), rounds });
    onDone(rubricResult(prompt, rubric, takes.reduce((a, t) => a + t.durationSec, 0)));
  };

  return (
    <>
      <div className="grow scroll stack">
        <PromptCard prompt={prompt} label={finished ? '4/3/2 retell: compare your rounds' : `4/3/2 retell: round ${round + 1} of ${limits.length} (${fmtTime(limits[round]!)})`} />
        {!finished && !take && <p className="muted small">Say the same content each round, just faster and smoother. Recording stops by itself when the time is up.</p>}
        {!finished && take && (
          <div className="card stack">
            <div className="row between"><b>Round {round + 1}: {fmtTime(take.durationSec)}</b><button className="btn sm" onClick={() => void play(take.blob)}>▶ Listen back</button></div>
            <label className="small muted" htmlFor="words">Optional: count your words while listening</label>
            <input id="words" inputMode="numeric" pattern="[0-9]*" placeholder="Number of words" value={words[round]}
              onChange={(e) => setWords(words.map((w, i) => (i === round ? e.target.value.replace(/\D/g, '') : w)))} />
          </div>
        )}
        {finished && (
          <>
            <div className="list">
              {rounds.map((r, i) => (
                <div key={i}>
                  <span>Round {i + 1}</span>
                  <span className="mono">{fmtTime(r.durationSec)} / {fmtTime(r.limitSec)}</span>
                  <span className="mono">{wpm(r) ? `${wpm(r)} wpm` : '– wpm'}</span>
                  <button className="btn sm" onClick={() => void play(takes[i]!.blob)} aria-label={`Play round ${i + 1}`}>▶</button>
                </div>
              ))}
            </div>
            <ModelDetails prompt={prompt} />
            <Rubric onDone={(rubric) => void finish(rubric)} />
          </>
        )}
      </div>
      {!finished && (take
        ? <button className="btn primary block" onClick={() => setRound(round + 1)}>{round + 1 < limits.length ? `Next round (${fmtTime(limits[round + 1]!)})` : 'Compare rounds'}</button>
        : <div className="stack center"><RecordButton key={round} maxSec={limits[round]} countdown label="Tap to start the round"
            onDone={(rec) => { setTakes([...takes, rec]); void saveRecording(prompt.id, 'retell', rec); }} /></div>)}
    </>
  );
}
