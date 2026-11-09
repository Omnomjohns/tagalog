# Salita

Offline-first Tagalog/Filipino **speaking** trainer, an iPhone PWA for one user (heritage speaker: understands well, struggles to speak).
Stack: Vite + React + TypeScript (strict), Dexie, ts-fsrs, vite-plugin-pwa, zod, vitest. No backend, no AI API at runtime.
Content is JSON in `/content/units`, validated with zod at build time. All LLM-written Tagalog is `needs_review`.
Deployed by GitHub Actions to GitHub Pages on push to `main`; Vite `base` is `/tagalog/`.
The user tests only on an iPhone 16 from the deployed URL. Everything else must be verified in the VM first.

**Full spec: `docs/SPEC.md` — read it before doing anything.**

## Phase status
- Phase 1 (MVP): **NOT STARTED — waiting for user OK on plan, folder tree and 10 sample items (SPEC section 12).**
- Phase 2: not started. Do not start unless the user explicitly asks.
- Phase 3: not started. Optional, ask first.

Open decisions awaiting the user: mascot name ("Mata" suggested) and colours.

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
