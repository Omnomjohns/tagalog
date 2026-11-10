# Salita

Offline-first Tagalog/Filipino **speaking** trainer, an iPhone PWA for one user (heritage speaker: understands well, struggles to speak).
Stack: Vite + React + TypeScript (strict), Dexie, ts-fsrs, vite-plugin-pwa, zod, vitest. No backend, no AI API at runtime.
Content is JSON in `/content/units`, validated with zod at build time. All LLM-written Tagalog is `needs_review`.
Deployed by GitHub Actions to GitHub Pages on push to `main`; Vite `base` is `/tagalog/`.
The user tests only on an iPhone 16 from the deployed URL. Everything else must be verified in the VM first.

**Full spec: `docs/SPEC.md` — read it before doing anything.**

## Phase status
- Phase 1 (MVP): **BUILT, waiting for the user's iPhone test** (SPEC section 11 checklist). Verified in the VM:
  type-check, 37 unit tests, production build, bundle 144 kB gzip (budget 200), headless smoke test
  (manifest, service worker, offline start, full session). Not verifiable here: everything iOS Safari.
- Phase 2: not started. Do not start unless the user explicitly asks.
- Phase 3: not started. Optional, ask first.

Decisions made with the user in Phase 1:
- Mascot is "Mata": caramel fur, cream belly, deep brown eyes.
- "Record reference" (SPEC 5b) is in Phase 1: Units → unit → tap a sentence. Shadowing only schedules items
  that have reference audio, because there is no generated audio before Phase 2.
- Extra dev dependencies approved: @types/react, @types/react-dom, @types/node, fake-indexeddb.
- Recordings are not part of the JSON export (zip export is Phase 2).

Things a new session should know:
- ts-fsrs is pinned at 6.0.0 and used through its legacy `fsrs()` API with short-term steps off (src/srs/fsrs.ts).
- Recordings are stored as ArrayBuffer + mimeType, not Blob (more robust in IndexedDB on iOS and in tests).
- Stored data format is `SCHEMA_VERSION = 1` (src/db/dexie.ts); a change needs a Dexie upgrade plus a backup migration.
- Content JSON was generated once from a compact script; edit the JSON files directly from now on.
- Playwright is not a dependency. `npm run smoke` and `npm run icons` use the VM's global copy (scripts/playwright.mjs).
- Item ids (u01-i001…) key the FSRS cards: never renumber, only append.

## Hard constraints (SPEC section 1)
1. PWA for iPhone 16, installed via Safari "Add to Home Screen", standalone, native feel. No Swift, no Xcode.
2. Fully offline after install. No AI API, no paid services, no backend at runtime. GitHub Pages only for install/updates.
3. Tagalog speech = pre-generated or user-recorded files. Never depend on the Web Speech API (feature-detect only).
4. Mascot is an ORIGINAL Philippine tarsier. No brand or trademarked mascot, imitated or referenced.
5. Production-first: >= 70% of session time is the learner producing language. Recognition exercises <= 10%, warm-up only.
6. MVP-first: no feature creep, accounts, analytics or external CDNs. Fonts bundled.

Also: the repo is PUBLIC. Never commit personal data, recordings, secrets or API keys.
No hash-based routing (WebKit bug 215884 can revoke mic permission in standalone mode).

## Working rules (SPEC section 12)
- Before coding a phase: show a one-page plan, the folder tree and sample items in chat. Wait for the user's OK.
- Ask before: any dependency not on the approved list, changing the stack, running the TTS script, final mascot
  name and colours, changing session defaults, anything touching stored data formats (schema version + migration).
- Approved deps: react, react-dom, vite, typescript, dexie, ts-fsrs, vite-plugin-pwa, zod, vitest,
  @fontsource/ibm-plex-sans, @fontsource/ibm-plex-mono, @fontsource/newsreader.
- Keep it small: under 5,000 lines of app code for Phase 1. No premature abstractions, no state libraries,
  no i18n framework (UI in English, Tagalog only in content).
- Tests for the FSRS wrapper, mastery, the session builder and backup import/export.
- Small logical commits, pushed to the working branch. The user creates and merges PRs themselves.
- After each phase: give the iPhone test checklist and the exact GitHub / iPhone steps. Then STOP.
- Be honest about what cannot be verified from the VM (anything iOS Safari) and propose the simplest fallback.
- Update the phase status in this file at the end of every phase.
