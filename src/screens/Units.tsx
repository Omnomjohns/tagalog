import type { ReactElement } from 'react';
import type { Go } from '../app/screens';
import { useQuery } from '../app/store';
import { isSchedulable } from '../content/loader';
import type { Content } from '../content/types';
import { db } from '../db/dexie';
import { Header } from '../ui/Bits';

export const reviewQueue = (content: Content): (Content['items'][number] | Content['prompts'][number])[] => {
  const live = new Set(content.units.filter((u) => u.status !== 'draft').map((u) => u.id));
  return [...content.items, ...content.prompts].filter((r) => r.review === 'needs_review' && live.has(r.unitId));
};

export function Units({ content, go }: { content: Content; go: Go }): ReactElement {
  const seen = useQuery(async () => new Set(await db.cards.toCollection().primaryKeys()));
  const pending = reviewQueue(content).length;
  return (
    <main className="screen">
      <Header title="Units" />
      <button className="banner" onClick={() => go({ name: 'review' })}>
        <span><b>Review queue:</b> {pending} unreviewed {pending === 1 ? 'sentence' : 'sentences'}</span><span className="link">Open</span>
      </button>
      <div className="list">
        {[...content.units].sort((a, b) => a.order - b.order).map((u) => {
          const items = content.items.filter((it) => it.unitId === u.id && isSchedulable(it, u));
          const done = items.filter((it) => seen?.has(it.id)).length;
          return (
            <button key={u.id} onClick={() => go({ name: 'unit', unitId: u.id })} aria-label={`Unit ${u.order}: ${u.titleEn}`}>
              <span>
                <span className="tl" style={{ fontSize: 19 }}>{u.order}. {u.title}</span>
                <span className="small muted" style={{ display: 'block' }}>{u.titleEn}</span>
              </span>
              {u.status === 'draft' ? <span className="badge">draft</span> : <span className="mono small muted">{done}/{items.length}</span>}
            </button>
          );
        })}
      </div>
    </main>
  );
}
