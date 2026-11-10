import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Recorder, type Recorded, type RecorderError } from '../speech/recorder';
import { fmtTime, Ring } from './Bits';

const HELP: Record<RecorderError, [string, string]> = {
  denied: ['Microphone access is off', 'Open the iPhone Settings app → Apps → Safari → Microphone and choose "Ask" or "Allow". Then come back and tap Record again. If Salita is installed on the Home Screen, close and reopen it first.'],
  unsupported: ['Recording is not available here', 'This browser cannot record audio. You can still practise aloud and rate yourself.'],
  failed: ['The recording stopped', 'Something interrupted the microphone (a call, another app, or the screen locking).'],
};

interface Props {
  onDone: (rec: Recorded) => void;
  maxSec?: number; // auto-stop and show a countdown ring
  countdown?: boolean; // show remaining time instead of elapsed time
  small?: boolean;
  label?: string;
}

/** Big tap-to-record button with timer, level meter, auto-stop and friendly error states. */
export function RecordButton({ onDone, maxSec, countdown, small, label = 'Record' }: Props): ReactElement {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sec, setSec] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<RecorderError>();
  const rec = useRef<Recorder | undefined>(undefined);
  const done = useRef(onDone);
  done.current = onDone;

  const stop = async (): Promise<void> => {
    if (!rec.current) return;
    const r = rec.current;
    rec.current = undefined;
    setOn(false);
    try { done.current(await r.stop()); } catch { setError('failed'); }
  };

  const start = async (): Promise<void> => {
    setError(undefined);
    setBusy(true);
    const r = new Recorder();
    r.onLevel = setLevel;
    r.onFail = (e) => { rec.current = undefined; setOn(false); setError(e); };
    try {
      await r.start();
      rec.current = r;
      setSec(0);
      setOn(true);
    } catch (e) {
      setError(e as RecorderError);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!on) return;
    const t0 = Date.now();
    const id = setInterval(() => setSec((Date.now() - t0) / 1000), 200);
    return () => clearInterval(id);
  }, [on]);
  useEffect(() => { if (on && maxSec && sec >= maxSec) void stop(); }, [on, sec, maxSec]);
  useEffect(() => () => rec.current?.cancel(), []);

  const shown = countdown && maxSec ? Math.max(0, maxSec - sec) : sec;
  return (
    <div className="rec">
      {error && (
        <div className="banner ox" role="alert">
          <div><b>{HELP[error][0]}</b><div className="small">{HELP[error][1]}</div></div>
        </div>
      )}
      <div className="timer" aria-live="off">{on || countdown ? fmtTime(countdown ? Math.ceil(shown) : shown) : ' '}</div>
      <button className={`rec-btn ${on ? 'on' : ''} ${small ? 'sm' : ''}`} disabled={busy} onClick={() => void (on ? stop() : start())}
        aria-label={on ? 'Stop recording' : error === 'failed' ? 'Tap to retry recording' : label}>
        {maxSec ? <Ring fraction={on ? 1 - sec / maxSec : 1} /> : null}
        <i />
      </button>
      <div className="meter" aria-hidden="true"><i style={{ width: `${on ? level * 100 : 0}%` }} /></div>
      <div className="small muted">{on ? 'Tap to stop' : error === 'failed' ? 'Tap to retry' : label}</div>
    </div>
  );
}
