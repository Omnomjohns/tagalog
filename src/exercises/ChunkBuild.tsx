import type { ReactElement } from 'react';
import type { Item } from '../content/types';

/** ChunkBuild: produce a sentence that must use the listed chunks or connectors. */
export function ChunkCue({ item, cue }: { item: Item; cue: string }): ReactElement {
  return (
    <>
      <h3>Build it with these chunks</h3>
      <div className="row wrap">{item.requiredChunks?.map((c) => <span key={c} className="chip">{c}</span>)}</div>
      <p style={{ fontSize: 19 }}>{cue}</p>
    </>
  );
}
