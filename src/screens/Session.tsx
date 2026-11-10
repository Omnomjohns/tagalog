import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { Go } from '../app/screens';
import { addTime, recordAnswer, updateStreak } from '../app/store';
import { skillName } from '../content/loader';
import type { Content, Item } from '../content/types';
import { db, type Settings } from '../db/dexie';
import { ProduceSentence, type ExerciseResult } from '../exercises/ProduceSentence';
import { Recognize } from '../exercises/Recognize';
import { Retell432 } from '../exercises/Retell432';
import { Shadow } from '../exercises/Shadow';
import { SpeakTask } from '../exercises/SpeakTask';
import { Mascot, type MascotState } from '../mascot/Mascot';
import { MascotSay } from '../mascot/MascotSay';
import type { StreakState } from '../progress/streak';
import { JUDGE_NOTE } from '../speech/AssessmentProvider';
import { chime, stopPlayback } from '../speech/player';
import type { Step } from '../srs/sessionBuilder';
import { Confirm, fmtTime } from '../ui/Bits';

const PHASES = { warmup: 'Warm-up', drill: 'Pattern drill', speak: 'Speaking task', wrap: 'Review' } as const;
type Queued = Step & { retry?: boolean };
interface Props { steps: Step[]; content: Content; settings: Settings; go: Go; }

export function Session({ steps, content, settings, go }: Props): ReactElement {
  const [queue, setQueue] = useState<Queued[]>(steps);
  const [index, setIndex] = useState(0);
  const [mood, setMood] = useState<MascotState>('encouraging');
  const [asking, setAsking] = useState(false);
  const [judgeSeen, setJudgeSeen] = useState<boolean>();
  const [streak, setStreak] = useState<StreakState>();
  const stats = useRef({ speakSec: 0, reviewed: 0, skills: new Set<string>(), goodOrBetter: 0 });
  const startedAt = useRef(Date.now());

  useEffect(() => { void db.get('judgeNoteSeen', false).then(setJudgeSeen); }, []);
  useEffect(() => { startedAt.current = Date.now(); return stopPlayback; }, [index]);

  const step = queue[index];
  const item = step?.kind === 'item' ? content.items.find((it) => it.id === step.id) : undefined;
  const prompt = step?.kind === 'prompt' ? content.prompts.find((p) => p.id === step.id) : undefined;
  const finished = index >= queue.length;

  useEffect(() => {
    if (!finished) return;
    if (settings.sound) chime('done');
    void updateStreak(content).then(setStreak);
  }, [finished, content, settings.sound]);

  const done = async (res: ExerciseResult): Promise<void> => {
    if (!step) return;
    const elapsed = Math.min(300, (Date.now() - startedAt.current) / 1000); // ignore long idle gaps
    const task = prompt ? (prompt.kind === 'retell432' ? 'retell' : 'speak') : item?.type === 'shadow' ? 'shadow' : 'drill';
    await recordAnswer({ refId: step.id, kind: step.kind, rating: res.rating, checks: res.checks, isNew: step.isNew, extra: step.extra || step.retry, rubric: res.rubric });
    await addTime(elapsed, res.speakSec ? { task, sec: res.speakSec } : undefined);
    if (step.phase === 'speak' && queue[index + 1]?.phase !== 'speak') await db.set('speakIndex', (await db.get('speakIndex', 0)) + 1);

    const s = stats.current;
    s.speakSec += res.speakSec;
    s.reviewed += 1;
    if (res.rating >= 3) s.goodOrBetter += 1;
    (item ?? prompt)?.skills.forEach((k) => s.skills.add(k));
    setMood(res.rating === 1 ? 'surprised' : res.rating === 2 ? 'encouraging' : 'happy');
    if (settings.sound) chime(res.rating === 1 ? 'again' : 'good');
    // "Again" on a card: see it once more a few steps later (practice only, no second FSRS rating).
    if (res.rating === 1 && step.kind === 'item' && !step.retry) {
      const at = Math.min(queue.length, index + 4);
      setQueue([...queue.slice(0, at), { ...step, retry: true }, ...queue.slice(at)]);
    }
    setIndex(index + 1);
  };

  if (finished) {
    const s = stats.current;
    return (
      <div className="screen session">
        <div className="grow scroll stack center" style={{ justifyContent: 'center' }}>
          <MascotSay state={s.reviewed ? 'celebrating' : 'thinking'} size={120} />
          <h1>Session done</h1>
          <div className="list" style={{ width: '100%' }}>
            <div><span>Speaking recorded</span><b className="mono">{fmtTime(s.speakSec)}</b></div>
            <div><span>Cards reviewed</span><b className="mono">{s.reviewed}</b></div>
            <div><span>Good or better</span><b className="mono">{s.goodOrBetter}</b></div>
            {streak && <div><span>Streak</span><b className="mono">{streak.current} {streak.current === 1 ? 'day' : 'days'}</b></div>}
          </div>
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            {[...s.skills].filter((k) => !k.startsWith('vocab_')).map((k) => <span key={k} className="badge teal">{skillName(k)}</span>)}
          </div>
        </div>
        <button className="btn primary block" onClick={() => go({ name: 'today' })}>Done</button>
      </div>
    );
  }

  const needsJudgeNote = !!prompt && judgeSeen === false;
  const body = (): ReactElement | null => {
    if (needsJudgeNote) {
      return (
        <>
          <div className="grow stack center" style={{ justifyContent: 'center' }}>
            <Mascot state="thinking" />
            <h2>Before your first speaking task</h2>
            <p>{JUDGE_NOTE}</p>
          </div>
          <button className="btn primary block" onClick={() => { setJudgeSeen(true); void db.set('judgeNoteSeen', true); }}>I understand</button>
        </>
      );
    }
    const key = `${step!.id}-${index}`;
    if (prompt) return prompt.kind === 'retell432'
      ? <Retell432 key={key} prompt={prompt} settings={settings} onDone={(r) => void done(r)} />
      : <SpeakTask key={key} prompt={prompt} settings={settings} onDone={(r) => void done(r)} />;
    if (!item) return <Missing onSkip={() => setIndex(index + 1)} />;
    const props = { item, settings, onDone: (r: ExerciseResult) => void done(r) };
    if (item.type === 'shadow') return <Shadow key={key} {...props} />;
    if (item.type === 'recognize') return <Recognize key={key} {...props} distractors={distractorsFor(item, content.items)} />;
    return <ProduceSentence key={key} {...props} />;
  };

  return (
    <div className="screen session">
      <div className="row">
        <button className="icon-btn" onClick={() => setAsking(true)} aria-label="End session">✕</button>
        <div className="progressbar" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={index} aria-label="Session progress">
          <i style={{ width: `${(index / queue.length) * 100}%` }} />
        </div>
        <Mascot state={mood} size={40} />
      </div>
      <div className="row between small muted">
        <span>{PHASES[step!.phase]}{step!.retry ? ' · again' : step!.extra ? ' · extra practice' : step!.isNew ? ' · new' : ''}</span>
        <span className="mono">{index + 1}/{queue.length}</span>
      </div>
      {body()}
      {asking && <Confirm title="End this session?" body="Everything you rated so far is saved." yes="End session" onYes={() => go({ name: 'today' })} onNo={() => setAsking(false)} />}
    </div>
  );
}

function Missing({ onSkip }: { onSkip: () => void }): ReactElement {
  return (
    <>
      <div className="grow stack center" style={{ justifyContent: 'center' }}><Mascot state="surprised" /><p>This item is no longer available.</p></div>
      <button className="btn primary block" onClick={onSkip}>Skip</button>
    </>
  );
}

/** Two wrong meanings for a recognition item, taken from other items of the same unit. */
function distractorsFor(item: Item, items: Item[]): string[] {
  const pool = items.filter((it) => it.unitId === item.unitId && it.id !== item.id && it.type !== 'transform' && it.cueEn !== item.cueEn);
  const recog = pool.filter((it) => it.type === 'recognize');
  const start = item.id.charCodeAt(item.id.length - 1) % Math.max(1, pool.length - 2);
  return [...recog, ...pool.slice(start)].slice(0, 2).map((it) => it.cueEn.replace(/^\(.*?\)\s*/, ''));
}
