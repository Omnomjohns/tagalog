import type { ReactElement } from 'react';
import type { Go } from '../app/screens';
import { Mascot } from '../mascot/Mascot';
import { JUDGE_NOTE } from '../speech/AssessmentProvider';
import { Header } from '../ui/Bits';

export const INSTALL_STEPS = [
  'Open the GitHub Pages URL in Safari on the iPhone.',
  'Wait for the "Ready offline" indicator on the Today screen.',
  'Tap Share → "Add to Home Screen" → Add.',
  'From now on, open the app ONLY from the icon.',
  'On first launch, allow persistent storage and the microphone when asked.',
  'Export a backup regularly from Settings.',
];

export function About({ go }: { go: Go }): ReactElement {
  return (
    <main className="screen">
      <Header title="About" onBack={() => go({ name: 'settings' })} />
      <div className="card row"><Mascot state="happy" size={72} /><p><b>Salita</b> is a personal, offline Tagalog speaking trainer. Mata the tarsier is an original character made for this app.</p></div>
      <div className="banner" role="note"><b>{JUDGE_NOTE}</b></div>
      <div className="card stack">
        <h3>Content quality</h3>
        <p className="small">The Tagalog sentences were drafted by an AI model and can contain errors. Until a fluent speaker approves a sentence in the Review queue it carries an "unreviewed" badge. Low-confidence sentences are held back until approved.</p>
      </div>
      <div className="card stack">
        <h3>Install on iPhone</h3>
        <ol style={{ margin: 0, paddingLeft: 20 }}>{INSTALL_STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
      </div>
      <div className="card stack">
        <h3>Attributions</h3>
        <p className="small">Fonts: IBM Plex Sans and IBM Plex Mono (IBM) and Newsreader (Production Type), SIL Open Font License 1.1, bundled via Fontsource.</p>
        <p className="small">Scheduling: ts-fsrs, the FSRS algorithm by the Open Spaced Repetition project (MIT). Storage: Dexie.js (Apache 2.0). Interface: React (MIT). Offline support: Workbox via vite-plugin-pwa (MIT).</p>
        <p className="small">Sentences: no Tatoeba sentences are included yet. If any are added, their IDs and authors will be listed here (CC BY 2.0 FR).</p>
        <p className="small">Audio: no generated audio is included. Model audio is whatever you record yourself as reference.</p>
      </div>
      <p className="small muted">Version {__APP_VERSION__} · no accounts, no analytics, no network use after install.</p>
    </main>
  );
}
