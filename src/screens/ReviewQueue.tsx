import { useEffect, useState, type ReactElement } from 'react';
import type { Go } from '../app/screens';
import { bump } from '../app/store';
import type { Content, Override, ReviewStatus } from '../content/types';
import { db } from '../db/dexie';
import { MascotSay } from '../mascot/MascotSay';
import { Header } from '../ui/Bits';
import { reviewQueue } from './Units';

/** One unreviewed sentence at a time: Approve, edit inline, or Reject. Edits are stored as local overrides. */
export function ReviewQueue({ content, go }: { content: Content; go: Go }): ReactElement {
  const queue = reviewQueue(content);
  const [skip, setSkip] = useState(0);
  const row = queue[skip % Math.max(1, queue.length)];
  const isItem = !!row && 'answers' in row;
  const original = row ? { cue: isItem ? row.cueEn : row.promptEn, answers: isItem ? row.answers.map((a) => a.tl) : [row.modelAnswer.tl], gloss: isItem ? (row.gloss ?? '') : '' } : undefined;
  const [draft, setDraft] = useState(original);
  useEffect(() => setDraft(original), [row?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!row || !draft || !original) {
    return (
      <main className="screen">
        <Header title="Review queue" onBack={() => go({ name: 'units' })} />
        <div className="grow stack center" style={{ justifyContent: 'center' }}>
          <MascotSay state="celebrating" />
          <p>Nothing left to review.</p>
        </div>
      </main>
    );
  }

  const save = async (review: ReviewStatus): Promise<void> => {
    const prev = await db.overrides.get(row.id);
    const o: Override = { ...prev, id: row.id, review, ts: Date.now() };
    if (draft.cue.trim() !== original.cue) o.cueEn = draft.cue.trim();
    if (draft.gloss.trim() !== original.gloss) o.gloss = draft.gloss.trim();
    if (draft.answers.some((a, i) => a.trim() !== original.answers[i])) o.answers = draft.answers.map((a) => a.trim());
    await db.overrides.put(o);
    bump();
  };
  const valid = draft.cue.trim() && draft.answers.every((a) => a.trim());

  return (
    <main className="screen">
      <Header title="Review queue" onBack={() => go({ name: 'units' })} right={<span className="mono small muted">{queue.length} left</span>} />
      <div className="row wrap">
        <span className="badge">{row.id}</span>
        <span className="badge">{isItem ? row.type : row.kind}</span>
        {isItem && <span className={`badge ${row.confidence === 'low' ? 'ox' : ''}`}>confidence: {row.confidence}</span>}
      </div>
      {isItem && row.sourceTl && <p className="small muted">Source: <span className="tl" style={{ fontSize: 17 }}>{row.sourceTl}</span> · {row.instruction}</p>}
      <label className="stack" style={{ gap: 4 }}><h3>Cue</h3>
        <textarea rows={2} value={draft.cue} onChange={(e) => setDraft({ ...draft, cue: e.target.value })} />
      </label>
      {draft.answers.map((a, i) => (
        <label key={i} className="stack" style={{ gap: 4 }}>
          <h3>{isItem ? `Tagalog answer ${i + 1} (${row.answers[i]!.register})` : 'Model answer'}</h3>
          <textarea className="tl" rows={isItem ? 2 : 6} lang="tl" autoCapitalize="sentences" autoCorrect="off" spellCheck={false} value={a}
            onChange={(e) => setDraft({ ...draft, answers: draft.answers.map((x, j) => (j === i ? e.target.value : x)) })} />
        </label>
      ))}
      {isItem && (
        <label className="stack" style={{ gap: 4 }}><h3>Grammar note</h3>
          <textarea rows={2} value={draft.gloss} onChange={(e) => setDraft({ ...draft, gloss: e.target.value })} />
        </label>
      )}
      <div className="grow" />
      <button className="btn primary block" disabled={!valid} onClick={() => void save('approved')}>Approve{JSON.stringify(draft) !== JSON.stringify(original) ? ' with edits' : ''}</button>
      <div className="row">
        <button className="btn danger" style={{ flex: 1 }} onClick={() => void save('rejected')}>Reject</button>
        <button className="btn" style={{ flex: 1 }} onClick={() => setSkip(skip + 1)}>Skip</button>
      </div>
    </main>
  );
}
