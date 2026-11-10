import { useEffect, useRef, useState, type ReactElement } from 'react';
import { isStandalone, requestPersistence } from '../app/pwa';
import type { Go } from '../app/screens';
import { bump, useQuery } from '../app/store';
import { describeBackup, exportData, importData, validateBackup, type Backup } from '../db/backup';
import { db, type Settings as S } from '../db/dexie';
import { dayKey } from '../progress/streak';
import { Confirm, Header, Seg } from '../ui/Bits';
import { mb, useStorageEstimate } from './Progress';

export function Settings({ settings, go }: { settings: S; go: Go }): ReactElement {
  const [persisted, setPersisted] = useState<boolean>();
  const [pending, setPending] = useState<Backup>();
  const [message, setMessage] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const lastExport = useQuery(() => db.get<number | null>('lastExportAt', null));
  const usage = useStorageEstimate();
  useEffect(() => { void navigator.storage?.persisted?.().then(setPersisted); }, []);

  const set = async (patch: Partial<S>): Promise<void> => {
    await db.set('settings', { ...settings, ...patch });
    bump();
  };

  const doExport = async (): Promise<void> => {
    const json = JSON.stringify(await exportData(db), null, 1);
    const name = `salita-backup-${dayKey()}.json`;
    const f = new File([json], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: name });
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(f);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      }
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return; // share sheet dismissed
      setMessage('The export failed. Try again.');
      return;
    }
    await db.set('lastExportAt', Date.now());
    bump();
    setMessage('Backup exported.');
  };

  const pick = async (f: File | undefined): Promise<void> => {
    if (!f) return;
    try {
      const result = validateBackup(JSON.parse(await f.text()));
      if (result.ok) setPending(result.backup);
      else setMessage(result.error);
    } catch {
      setMessage('This file is not valid JSON.');
    }
    if (file.current) file.current.value = '';
  };
  const doImport = async (): Promise<void> => {
    if (!pending) return;
    await importData(db, pending);
    setPending(undefined);
    bump();
    setMessage('Backup imported.');
  };

  return (
    <main className="screen">
      <Header title="Settings" />
      <h3>Session</h3>
      <Seg label="Session length" value={settings.sessionMinutes} onChange={(v) => void set({ sessionMinutes: v })} options={[[5, '5 min'], [10, '10 min'], [15, '15 min']]} />
      <div className="list">
        <label>New cards per day
          <select style={{ width: 96 }} value={settings.newPerDay} onChange={(e) => void set({ newPerDay: Number(e.target.value) })}>{[5, 10, 15, 20].map((n) => <option key={n}>{n}</option>)}</select>
        </label>
        <label>Max reviews per day
          <select style={{ width: 96 }} value={settings.maxReviews} onChange={(e) => void set({ maxReviews: Number(e.target.value) })}>{[30, 60, 100].map((n) => <option key={n}>{n}</option>)}</select>
        </label>
        <label>Desired retention
          <select style={{ width: 96 }} value={settings.retention} onChange={(e) => void set({ retention: Number(e.target.value) })}>{[0.85, 0.9, 0.93].map((n) => <option key={n} value={n}>{Math.round(n * 100)}%</option>)}</select>
        </label>
      </div>
      <h3>Retell rounds</h3>
      <Seg label="Retell round lengths" value={settings.retellSeconds[0]} onChange={(v) => void set({ retellSeconds: v === 90 ? [90, 60, 45] : [240, 180, 120] })} options={[[90, '90 / 60 / 45 s'], [240, '4 / 3 / 2 min']]} />
      <h3>Cue language</h3>
      <Seg label="Cue language" value={settings.cueLang} onChange={(v) => void set({ cueLang: v })} options={[['en', 'English'], ['de', 'Deutsch'], ['both', 'Both']]} />
      <h3>Appearance</h3>
      <Seg label="Theme" value={settings.theme} onChange={(v) => void set({ theme: v })} options={[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]} />
      <Seg label="Sounds" value={settings.sound ? 'on' : 'off'} onChange={(v) => void set({ sound: v === 'on' })} options={[['on', 'Sounds on'], ['off', 'Sounds off']]} />

      <h3>Storage</h3>
      <div className="list">
        <div><span>Persistent storage</span><b>{persisted === undefined ? 'unknown' : persisted ? 'persisted() = true' : 'persisted() = false'}</b></div>
        <div><span>Used on this device</span><b className="mono">{usage === undefined ? '–' : mb(usage)}</b></div>
        <div><span>Opened as</span><b>{isStandalone() ? 'Home Screen app' : 'Browser tab'}</b></div>
      </div>
      {persisted === false && <button className="btn sm" onClick={() => void requestPersistence().then(setPersisted)}>Request persistent storage</button>}

      <h3>Backup</h3>
      <p className="small muted">Exports progress, card schedules, content edits and settings as JSON. Recordings stay on this device. Last export: {lastExport ? dayKey(new Date(lastExport)) : 'never'}.</p>
      <div className="row">
        <button className="btn" style={{ flex: 1 }} onClick={() => void doExport()}>Export</button>
        <button className="btn" style={{ flex: 1 }} onClick={() => file.current?.click()}>Import</button>
        <input ref={file} type="file" accept="application/json,.json" hidden aria-label="Backup file" onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
      {message && <p role="status" className="small">{message}</p>}

      <div className="list">
        <button onClick={() => go({ name: 'review' })}><span>Review queue</span><span aria-hidden="true">›</span></button>
        <button onClick={() => go({ name: 'about' })}><span>About and install steps</span><span aria-hidden="true">›</span></button>
      </div>
      {pending && <Confirm title="Replace all progress?" body={`${describeBackup(pending)} Everything currently in the app, except recordings, will be replaced.`} yes="Import and replace" danger onYes={() => void doImport()} onNo={() => setPending(undefined)} />}
    </main>
  );
}
