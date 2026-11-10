import { useState, type ReactElement } from 'react';
import type { Go } from '../app/screens';
import { bump, modelAudio, referenceIds, saveRecording, useQuery } from '../app/store';
import { skillName } from '../content/loader';
import type { Content, Item } from '../content/types';
import { db } from '../db/dexie';
import { ModelAnswers } from '../exercises/ProduceSentence';
import { play } from '../speech/player';
import { Header, Sheet } from '../ui/Bits';
import { RecordButton } from '../ui/RecordButton';

export function UnitDetail({ content, unitId, go }: { content: Content; unitId: string; go: Go }): ReactElement {
  const [open, setOpen] = useState<Item>();
  const refs = useQuery(referenceIds);
  const unit = content.units.find((u) => u.id === unitId)!;
  const of = <T extends { unitId: string }>(rows: T[]): T[] => rows.filter((r) => r.unitId === unitId);

  return (
    <main className="screen">
      <Header title={unit.title} onBack={() => go({ name: 'units' })} right={unit.status === 'draft' ? <span className="badge">draft</span> : undefined} />
      <div className="card stack">
        <h3>Goals</h3>
        <ul style={{ margin: 0, paddingLeft: 20 }}>{unit.goals.map((g) => <li key={g}>{g}</li>)}</ul>
        <div className="row wrap">{unit.skills.map((s) => <span key={s} className="badge teal">{skillName(s)}</span>)}</div>
      </div>

      {of(content.patterns).map((p) => (
        <details key={p.id} className="card">
          <summary>{p.name}</summary>
          <div className="stack">
            <p className="mono small">{p.formula}</p>
            <p className="muted">{p.explanationEn}</p>
            {p.examples.map((e) => <p key={e.tl}><span className="tl" style={{ fontSize: 18 }}>{e.tl}</span><br /><span className="small muted">{e.en}</span></p>)}
          </div>
        </details>
      ))}

      {of(content.chunks).length > 0 && (
        <details className="card">
          <summary>Chunks ({of(content.chunks).length})</summary>
          <div className="stack">{of(content.chunks).map((c) => <p key={c.id}><span className="tl" style={{ fontSize: 18 }}>{c.tl}</span> <span className="small muted">· {c.en}</span></p>)}</div>
        </details>
      )}

      {of(content.prompts).length > 0 && (
        <details className="card">
          <summary>Speaking prompts ({of(content.prompts).length})</summary>
          <div className="stack">{of(content.prompts).map((p) => <p key={p.id} className="small"><span className="badge">{p.kind}</span> {p.promptEn}</p>)}</div>
        </details>
      )}

      <h3>Sentences ({of(content.items).length})</h3>
      <div className="list">
        {of(content.items).map((it) => (
          <button key={it.id} onClick={() => setOpen(it)}>
            <span>
              <span className="tl" style={{ fontSize: 17 }}>{it.answers[0]!.tl}</span>
              <span className="small muted" style={{ display: 'block' }}>{it.cueEn}</span>
            </span>
            <span className="row" style={{ gap: 4 }}>
              {refs?.has(it.id) && <span className="badge teal" aria-label="Has reference audio">♪</span>}
              {it.review === 'rejected' ? <span className="badge ox">rejected</span> : it.review !== 'approved' && it.confidence === 'low' ? <span className="badge ox">held back</span> : null}
            </span>
          </button>
        ))}
      </div>
      {open && <ItemSheet item={open} hasRef={!!refs?.has(open.id)} onClose={() => setOpen(undefined)} />}
    </main>
  );
}

/** Item details plus "Record reference": your own (or a family member's) model audio for this sentence. */
function ItemSheet({ item, hasRef, onClose }: { item: Item; hasRef: boolean; onClose: () => void }): ReactElement {
  const playRef = async (): Promise<void> => { const a = await modelAudio(item.id); if (a) void play(a); };
  const remove = async (): Promise<void> => {
    await db.recordings.where('[kind+refId]').equals(['reference', item.id]).delete();
    bump();
  };
  return (
    <Sheet onClose={onClose} label="Sentence details">
      <div className="row between">
        <span className="row wrap"><span className="badge">{item.type}</span><span className="badge">{item.review.replace('_', ' ')}</span><span className="badge">confidence: {item.confidence}</span></span>
        <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <p>{item.cueEn}</p>
      <ModelAnswers item={item} />
      <h3>Reference audio</h3>
      <p className="small muted">Record a fluent speaker saying the model answer. It is used as the model audio and unlocks shadowing for this sentence.</p>
      {hasRef && (
        <div className="row">
          <button className="btn sm" onClick={() => void playRef()}>▶ Play reference</button>
          <button className="btn sm danger" onClick={() => void remove()}>Delete</button>
        </div>
      )}
      <RecordButton small maxSec={30} label={hasRef ? 'Record again' : 'Record reference'} onDone={(rec) => void saveRecording(item.id, 'reference', rec)} />
    </Sheet>
  );
}
