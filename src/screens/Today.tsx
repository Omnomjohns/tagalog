import { useState, type ReactElement } from 'react';
import { isStandalone } from '../app/pwa';
import type { Go } from '../app/screens';
import { bump, dueLeft, getDay, planSession, useQuery } from '../app/store';
import type { Content } from '../content/types';
import { db, type Settings } from '../db/dexie';
import { MascotSay } from '../mascot/MascotSay';
import { GOAL_SPEAK_SEC, initialStreak, speakTotal, type StreakState } from '../progress/streak';
import { fmtTime, Seg } from '../ui/Bits';

const EXPORT_REMINDER_DAYS = 14;
interface Props { content: Content; settings: Settings; go: Go; offlineReady: boolean; }

export function Today({ content, settings, go, offlineReady }: Props): ReactElement {
  const [starting, setStarting] = useState(false);
  const day = useQuery(() => getDay());
  const due = useQuery(() => dueLeft(content), [content]);
  const streak = useQuery(() => db.get<StreakState>('streak', initialStreak));
  const lastBackup = useQuery(async () => (await db.get<number | null>('lastExportAt', null)) ?? (await db.get<number | null>('firstUseAt', null)));
  const spoken = speakTotal(day);
  const goalMet = !!day?.goalMet;
  const atRisk = !goalMet && (streak?.current ?? 0) > 0 && new Date().getHours() >= 20;
  const backupDue = !!lastBackup && Date.now() - lastBackup > EXPORT_REMINDER_DAYS * 86_400_000;

  const start = async (): Promise<void> => {
    setStarting(true);
    go({ name: 'session', steps: await planSession(content, settings.sessionMinutes) });
  };
  const setMinutes = async (m: 5 | 10 | 15): Promise<void> => {
    await db.set('settings', { ...settings, sessionMinutes: m });
    bump();
  };

  return (
    <main className="screen">
      <div className="row between">
        <h1>Salita</h1>
        <span className="badge amber" aria-label={`Streak ${streak?.current ?? 0} days, ${streak?.freezes ?? 0} freezes`}>
          {streak?.current ?? 0}-day streak · {streak?.freezes ?? 0} ❄
        </span>
      </div>
      <MascotSay state={goalMet ? 'celebrating' : atRisk ? 'sleepy' : 'happy'} pick={new Date().getDate()} />

      {!isStandalone() && (
        <div className="banner" role="note">
          <span><b>Install to Home Screen.</b> Data in Safari tabs can be deleted after 7 days and is separate from the installed app.</span>
          <button className="link" onClick={() => go({ name: 'about' })}>How</button>
        </div>
      )}
      {backupDue && (
        <div className="banner" role="note">
          <span>It has been over {EXPORT_REMINDER_DAYS} days since your last backup.</span>
          <button className="link" onClick={() => go({ name: 'settings' })}>Export</button>
        </div>
      )}

      <div className="card stack">
        <div className="row between"><h3>Today's goal</h3>{goalMet && <span className="badge teal">done</span>}</div>
        <div className="row">
          <span className="mono">{fmtTime(spoken)} / {fmtTime(GOAL_SPEAK_SEC)}</span>
          <div className="progressbar amber"><i style={{ width: `${Math.min(100, (spoken / GOAL_SPEAK_SEC) * 100)}%` }} /></div>
        </div>
        <p className="small muted">Speaking recorded · {due ?? 0} {due === 1 ? 'review' : 'reviews'} due</p>
      </div>
      <p className="small muted" role="status">{offlineReady ? '✓ Ready offline' : 'Preparing offline use…'}</p>

      <div className="grow" />
      <Seg label="Session length" value={settings.sessionMinutes} onChange={(m) => void setMinutes(m)}
        options={[[5, '5 min'], [10, '10 min'], [15, '15 min']]} />
      <button className="btn primary block" disabled={starting} onClick={() => void start()}>
        {goalMet ? 'Practise more' : "Start today's session"}
      </button>
    </main>
  );
}
