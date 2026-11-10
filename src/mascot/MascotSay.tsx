import { useState, type ReactElement } from 'react';
import { Mascot, type MascotState } from './Mascot';

interface Line { tl: string; en: string; review: 'needs_review'; }
const L = (tl: string, en: string): Line => ({ tl, en, review: 'needs_review' });

/** Mata's lines. LLM-written Filipino, marked needs_review like all other content. */
export const LINES: Record<MascotState, Line[]> = {
  happy: [L('Ayos!', 'Nice!'), L('Tara, usap tayo!', "Come on, let's talk!"), L('Ang galing mo!', "You're doing great!")],
  encouraging: [L("Kaya mo 'yan!", 'You can do it!'), L('Sige pa!', 'Keep going!'), L('Konti na lang!', 'Just a little more!')],
  thinking: [L('Hmm, isipin muna natin…', "Hmm, let's think first…"), L('Sandali lang…', 'Just a moment…')],
  celebrating: [L('Ang husay!', 'Excellent!'), L('Tapos na! Ang galing!', 'Done! Well done!')],
  sleepy: [L('Inaantok na ako… mag-practice tayo?', "I'm getting sleepy… shall we practise?")],
  surprised: [L('Ay! Ulitin natin mamaya.', "Oh! Let's repeat it later."), L('Okay lang, subukan ulit!', "It's okay, try again!")],
};

/** Mascot with a speech bubble. Tapping the bubble shows the English. */
export function MascotSay({ state, size = 96, pick = 0, line }: { state: MascotState; size?: number; pick?: number; line?: Line }): ReactElement {
  const [en, setEn] = useState(false);
  const l = line ?? LINES[state][pick % LINES[state].length]!;
  return (
    <div className="mascot-say">
      <Mascot state={state} size={size} />
      <button className="bubble" onClick={() => setEn(!en)} aria-label={`Mata says: ${l.tl}. Tap for ${en ? 'Filipino' : 'English'}.`}>
        <span className="tl">{en ? l.en : l.tl}</span>
      </button>
    </div>
  );
}
