import { useEffect, useState, type ReactElement } from 'react';
import { bump, pruneRecordings, recordingBlob, useQuery } from '../app/store';
import { skillName } from '../content/loader';
import type { Content } from '../content/types';
import { db, type RetellRow } from '../db/dexie';
import { wpm } from '../exercises/Retell432';
import { Mascot } from '../mascot/Mascot';
import { addDays, dayKey, initialStreak, speakTotal, type DayRow, type StreakState } from '../progress/streak';
import { play } from '../speech/player';
import { level, LEVELS } from '../srs/mastery';
import { fmtTime, Header } from '../ui/Bits';

const WARN_BYTES = 300 * 1024 * 1024;
export const mb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(bytes < 10_485_760 ? 1 : 0)} MB`;

export function useStorageEstimate(dep?: unknown): number | undefined {
  const [usage, setUsage] = useState<number>();
  useEffect(() => { void navigator.storage?.estimate?.().then((e) => setUsage(e.usage ?? 0)); }, [dep]);
  return usage;
}

/** Calendar heatmap of speaking minutes for the last 12 weeks. Amber outline = daily goal met. */
function Heatmap({ days }: { days: DayRow[] }): ReactElement {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const today = dayKey();
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const start = addDays(today, -(11 * 7 + weekday));
  const cells = Array.from({ length: 11 * 7 + weekday + 1 }, (_, i) => addDays(start, i));
  const lvl = (sec: number): number => (sec <= 0 ? 0 : sec < 60 ? 1 : sec < 180 ? 2 : sec < 360 ? 3 : 4);
  return (
    <svg className="heat" viewBox="0 0 168 98" role="img" aria-label="Speaking minutes per day, last 12 weeks">
      {cells.map((day, i) => {
        const d = byDay.get(day);
        return <rect key={day} x={Math.floor(i / 7) * 14 + 1} y={(i % 7) * 14 + 1} width="12" height="12" rx="3"
          className={`l${lvl(speakTotal(d))} ${d?.goalMet ? 'goal' : ''}`}><title>{`${day}: ${fmtTime(speakTotal(d))}`}</title></rect>;
      })}
    </svg>
  );
}

/** Words per minute of the last round of each 4/3/2 retell that has a word count. */
function WpmChart({ retells }: { retells: RetellRow[] }): ReactElement {
  const points = retells.map((r) => [...r.rounds].reverse().map(wpm).find((v) => v)).filter((v): v is number => !!v).slice(-20);
  if (points.length < 2) return <p className="small muted">Count your words after 4/3/2 retells to see your speaking speed here. Two retells are needed for a trend.</p>;
  const max = Math.max(...points), min = Math.min(...points), span = Math.max(1, max - min);
  const xy = points.map((p, i) => [20 + (i / (points.length - 1)) * 270, 70 - ((p - min) / span) * 55] as const);
  return (
    <svg className="chart" viewBox="0 0 300 84" role="img" aria-label={`Words per minute over the last ${points.length} retells, from ${points[0]} to ${points.at(-1)}`}>
      <line x1="20" y1="70" x2="290" y2="70" /><line x1="20" y1="15" x2="290" y2="15" />
      <text x="0" y="73">{min}</text><text x="0" y="18">{max}</text>
      <polyline points={xy.map((p) => p.join(',')).join(' ')} />
      {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" />)}
    </svg>
  );
}

export function Progress({ content }: { content: Content }): ReactElement {
  const streak = useQuery(() => db.get<StreakState>('streak', initialStreak));
  const days = useQuery(() => db.days.toArray());
  const skills = useQuery(() => db.skills.toArray());
  const retells = useQuery(() => db.retells.orderBy('ts').toArray());
  const recs = useQuery(() => db.recordings.orderBy('ts').reverse().limit(15).toArray());
  const usage = useStorageEstimate(recs);
  const title = (id: string): string => content.items.find((i) => i.id === id)?.answers[0]?.tl ?? content.prompts.find((p) => p.id === id)?.promptEn ?? id;
  const total = (days ?? []).reduce((a, d) => a + speakTotal(d), 0);

  return (
    <main className="screen">
      <Header title="Progress" />
      <div className="card row">
        <Mascot state={(streak?.current ?? 0) > 0 ? 'happy' : 'encouraging'} size={64} />
        <div className="stack" style={{ gap: 2 }}>
          <b>{streak?.current ?? 0}-day streak <span className="muted small">· best {streak?.best ?? 0}</span></b>
          <span className="small muted">{streak?.freezes ?? 0} of 2 streak freezes · {fmtTime(total)} spoken in total</span>
        </div>
      </div>

      <div className="card stack"><h3>Speaking minutes</h3><Heatmap days={days ?? []} /></div>

      <div className="card stack">
        <h3>Skills</h3>
        {!skills?.length && <p className="small muted">Finish a session to see your skills here.</p>}
        {[...(skills ?? [])].sort((a, b) => a.value - b.value).map((s) => (
          <div key={s.skill}>
            <div className="row between small"><span>{skillName(s.skill)}</span><span className="muted">{LEVELS[level(s)]} · {s.count}</span></div>
            <div className="progressbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.value * 100)} aria-label={`${skillName(s.skill)} mastery`}>
              <i style={{ width: `${s.value * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="card stack"><h3>Retell speed (words per minute)</h3><WpmChart retells={retells ?? []} /></div>

      <div className="card stack">
        <div className="row between"><h3>Recent recordings</h3><span className="mono small muted">{usage === undefined ? '' : mb(usage)}</span></div>
        {usage !== undefined && usage > WARN_BYTES && <div className="banner ox">Salita uses more than 300 MB. Clean old recordings to free space.</div>}
        {!recs?.length && <p className="small muted">No recordings yet.</p>}
        {recs?.map((r) => (
          <div key={r.id} className="row between">
            <button className="btn sm" onClick={() => void play(recordingBlob(r))} aria-label="Play recording">▶</button>
            <span className="small" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title(r.refId)}<br /><span className="muted mono">{dayKey(new Date(r.ts))} · {fmtTime(r.durationSec)} · {r.kind}</span>
            </span>
            <button className="icon-btn" aria-pressed={r.starred} aria-label={r.starred ? 'Remove star' : 'Star to keep'}
              style={r.starred ? { color: 'var(--amber)' } : undefined} onClick={() => void db.recordings.update(r.id!, { starred: !r.starred }).then(bump)}>{r.starred ? '★' : '☆'}</button>
            <button className="icon-btn" aria-label="Delete recording" onClick={() => void db.recordings.delete(r.id!).then(bump)}>🗑</button>
          </div>
        ))}
        <button className="btn sm" onClick={() => void pruneRecordings(true)}>Clean old recordings</button>
        <p className="small muted">Keeps the newest take per sentence, retells from the last 30 days, starred and reference recordings.</p>
      </div>
    </main>
  );
}
