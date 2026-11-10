# Salita

A personal, offline-first Tagalog/Filipino **speaking** trainer. It is a Progressive Web App for iPhone:
no accounts, no backend, no AI service. After installing it works without a network connection.

Salita cannot check your grammar automatically. You are the judge: compare with the model and be honest.

## Install on iPhone

1. Open the GitHub Pages URL in Safari on the iPhone: `https://omnomjohns.github.io/tagalog/`
2. Wait for the "Ready offline" indicator on the Today screen.
3. Tap Share → "Add to Home Screen" → Add.
4. From now on, open the app ONLY from the icon. Data in a Safari tab is separate and can be deleted after 7 days.
5. On first launch, allow persistent storage and the microphone when asked.
6. Export a backup regularly from Settings.

## Daily reminder

There is no server, so the app cannot send push notifications. Use an iOS Shortcuts automation instead:

1. Open the Shortcuts app → Automation → New Automation → Time of Day.
2. Pick the time, set it to repeat Daily and choose "Run Immediately".
3. Add the action "Open URLs" with the GitHub Pages URL above, or "Open App" → Salita if it is listed.

## Content and review

Sentences live in `content/units/*.json`, one file per unit, validated at build time (`scripts/build-content.ts`).
The Tagalog was drafted by an AI model and is marked `needs_review`. In the app, Units → Review queue shows
each sentence with Approve / edit / Reject. Edits are stored on the device and included in the backup export
(`data.overrides`), so they can be copied back into the JSON files.

- Rejected sentences and unreviewed low-confidence sentences are never scheduled.
- Unreviewed medium and high confidence sentences are scheduled with an "unreviewed" badge.
- Shadowing needs model audio. Record it under Units → a unit → tap a sentence → "Record reference".

## Development

```bash
npm ci
```

```bash
npm run verify
```

`verify` validates the content, type-checks, builds, runs the unit tests and checks the bundle budget
(initial JavaScript under 200 kB gzipped). `npm run smoke` runs a headless browser test of the built app and
`npm run icons` regenerates the icons from the mascot; both need a globally installed Playwright.

Deployment: every push to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`).
In the repository, set Settings → Pages → Build and deployment → Source to "GitHub Actions" once.

The full specification is in `docs/SPEC.md`.

## Licences

Fonts: IBM Plex Sans, IBM Plex Mono and Newsreader (SIL Open Font License 1.1). Libraries: React (MIT),
Dexie.js (Apache 2.0), ts-fsrs (MIT), vite-plugin-pwa and Workbox (MIT).
