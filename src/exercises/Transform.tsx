import type { ReactElement } from 'react';
import type { Item } from '../content/types';

/** Transform: a Tagalog sentence plus an instruction ("Make it contemplated", "Add: still"). */
export function TransformCue({ item }: { item: Item }): ReactElement {
  return (
    <>
      <h3>Transform</h3>
      <p className="tl">{item.sourceTl}</p>
      <p><b>{item.instruction}</b></p>
      <details><summary>Hint: target meaning</summary><p className="muted">{item.cueEn}</p></details>
    </>
  );
}
