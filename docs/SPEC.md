# PROJECT: "Salita" – offline Tagalog/Filipino speaking trainer (iPhone PWA)

## 0. HOW THIS PROJECT RUNS (read this first)
- You are running in a Claude Code CLOUD session on a GitHub repository I created for this app. The repository is PUBLIC (required for free GitHub Pages). Never commit personal data, recordings, secrets or API keys.
- FIRST COMMIT: save this entire prompt verbatim as `docs/SPEC.md`. Create a short `CLAUDE.md` at the repo root containing: a 5-line project summary, the hard constraints (section 1), the working rules (section 12), the current phase status, and a pointer to `docs/SPEC.md`. Update the phase status in `CLAUDE.md` at the end of every phase. Each new cloud session starts from a fresh clone, so these two files are the only project memory that carries over.
- GIT FLOW: commit and push to your working branch. I create and merge the pull request myself. Deployment = a GitHub Actions workflow that builds and deploys to GitHub Pages on every push to `main` (actions/upload-pages-artifact + actions/deploy-pages, permissions `pages: write` and `id-token: write`).
- GITHUB PAGES SETUP is manual on my side. When it is needed, give me the exact click path: repo Settings → Pages → Build and deployment → Source: "GitHub Actions". Derive Vite `base` from the repo name in the git remote (`/<repo-name>/`). Make manifest `start_url` and `scope` relative to that base.
- I HAVE NO MAC AND NO LOCAL DEV SETUP. I test ONLY on my iPhone 16, using the deployed GitHub Pages URL. So everything must be checked in this VM before I test: type-check, unit tests, production build, bundle-size check. If a headless browser is already available, smoke-test that the built app loads and the service worker registers. Do not fight blocked browser downloads. You cannot test iOS Safari here. Tell me plainly which behaviours only I can check, and give me the iPhone checklist (section 11).
- VM LIMITS: foreground commands time out after 2 min by default (10 min max), so keep scripts fast. The default network allowlist includes npm, PyPI, GitHub and the common registries. Hugging Face is NOT on it, which matters for the Phase 2 TTS script (section 5).
- SCOPE OF THIS SESSION: Phase 1 only. When Phase 1 is done, stop, report and wait. Do not start Phase 2 unless I explicitly ask.

# ROLE AND CONTEXT
You are building a small, personal, offline-first language-learning web app ("Salita") for ONE user. You are a senior TypeScript/PWA engineer and you apply second-language-acquisition research. Keep the codebase small, readable and boring. Ask me before any major decision (listed in section 12).

USER PROFILE (design everything around this):
- 20, lives in Cologne, Germany. Bilingual German/English, Filipino background.
- Receptive/heritage bilingual: understands spoken Tagalog well, struggles to SPEAK. Typical heritage gaps to target:
  - overusing actor focus (mag-/-um-) where object, locative or benefactive focus is natural
  - English-like subject-first word order instead of verb-first
  - shaky aspect forms (completed / incompleted / contemplated)
  - enclitic misplacement (ba, na, pa, po, rin, naman…)
  - avoiding long or complex sentences
  - switching to English for abstract topics
- Goal: standard conversational Filipino good enough for in-depth conversations (opinions, stories, explaining, feelings, plans, family, work, current topics). Not survival phrases, and not deep, archaic or purist vocabulary.
- Busy (university + part-time job): sessions are 5–15 minutes and must be high-yield.

# 1. HARD CONSTRAINTS
1. Platform: Progressive Web App for iPhone 16 (current iOS), installed via Safari > Share > "Add to Home Screen". Must launch full-screen (standalone) and feel native. NO native Swift, NO Xcode.
2. Fully offline after install: no AI API, no paid services, no backend at runtime. Free static hosting (GitHub Pages) is used only for installs and updates.
3. All Tagalog speech assets are pre-generated or user-recorded files. Do NOT rely on the Web Speech API for Filipino: iOS has no fil-PH dictation and no Filipino TTS voice. Feature-detect it anyway, but never depend on it.
4. Mascot: an ORIGINAL Philippine tarsier character (see section 8). Do not use, imitate or reference any brand or trademarked mascot.
5. Production-first: at least 70% of session time is the learner producing language (speaking, or thinking then speaking). Recognition-only exercises (multiple choice, tap-the-word) are at most 10% of exercises, and only as warm-ups.
6. MVP-first: ship Phase 1 fully working before adding anything. No feature creep, no accounts, no analytics, no external CDNs. Fonts must be bundled with the app (section 9).

# 2. PEDAGOGY SPEC (based on the research; implement exactly)
Principles:
- pushed output (Swain's output hypothesis: speaking reveals gaps)
- retrieval practice
- FSRS spaced repetition
- interleaving of grammar patterns
- lexical chunks over isolated words
- timed repetition for fluency (4/3/2 technique, Nation 1989; de Jong & Perfetti 2011)
- shadowing
- self-recording and comparison
- deliberate practice on the learner's specific weak skills

DAILY SESSION LOOP ("Today", default 10 min; user can pick 5 / 10 / 15):
 1. Warm-up retrieval (1–2 min): 5–8 due FSRS production cards. Cue in English or German → say the Tagalog aloud → reveal → self-rate.
 2. Pattern drill (2–4 min): 6–10 transformation items on today's target grammar, e.g. change actor→object focus, completed→contemplated, or insert "pa rin" / "na ba" / "po" in the correct position. Say it aloud, then reveal.
 3. Speaking task (3–6 min), one of these (rotate by unit):
    a. Prompted output: a situation card (e.g. "Explain to your Tita what you study and why") with 3–5 required chunks. Record 45–90 s.
    b. 4/3/2 retell: the same topic three times with a countdown (90/60/45 s by default in the MVP; can be set to 4/3/2 min). Record each round. Show the self-counted words per minute and compare the rounds.
    c. Shadowing: play the model sentence audio, record the imitation immediately, A/B playback.
 4. Spaced review wrap-up (1–2 min): the remaining due cards. Introduce new cards only while the day's due load is under the limit (default 10 new/day).
 5. Session summary: speaking seconds recorded, cards reviewed, skills practised, mascot reaction.

EXERCISE TYPES, ranked by priority (implement 1–6 in Phase 1):
 1. ProduceSentence: cue (EN/DE + short context) → speak (optionally record) → reveal model answer + audio → checklist → self-rate Again/Hard/Good/Easy (maps to FSRS Rating).
 2. Transform: a Tagalog sentence + an instruction ("Make it object focus", "Make it contemplated aspect", "Add: also / still / already") → produce → reveal.
 3. ChunkBuild: produce a sentence that must use 2–3 listed chunks or connectors (e.g. "kasi", "kaya", "pero sa tingin ko").
 4. Speak (situation card / opinion / story): recorded, scored with the rubric.
 5. Retell432: timed repetition, recorded rounds.
 6. Shadow: listen → record → compare.
 7. (Optional, max 10%) Recognize: listen and pick the meaning. Only for introducing new grammar.
 8. Phase 2: NarrateMyDay (free speaking journal with a daily prompt), ThinkAloud (describe what you're doing right now for 60 s).

SELF-CHECK CHECKLIST shown after every production item (the learner ticks what was correct; unticked rows feed the skill stats):
 - Verb first / natural word order
 - Correct focus (the affix matches the ang-phrase: actor -um-/mag-/ma-, object -in/i-, locative -an, benefactive i-/ipag-, instrumental ipang-)
 - Correct aspect (completed / incompleted / contemplated / recently completed ka-)
 - Markers ang/ng/sa, si/ni/kay
 - Linker na / -ng
 - Enclitic order (ko/mo/ka → na/pa → nga/rin/lang/po/ba/kasi → daw/muna/naman → kaya/pala/sana/yata → siya/ako/niya…)
 - Politeness (po/opo, kayo/ninyo) when the cue says "to an elder"
 - No English filler needed
Show only the rows tagged as relevant to the item (via `item.skills`).

# 3. CURRICULUM OUTLINE (function × grammar)
Each unit = 1 grammar spine + 1 conversational function + 40–80 items + 6–10 speaking prompts. The MVP ships Units 1–3 fully built. Units 4–10 exist as JSON stubs (title, goals, skills, 5 sample items each, status "draft").
 U1 Ako at ang pamilya ko: introducing yourself, your family and background (Cologne, studies, work). Grammar: ang/ng/sa, si/ni/kay, pronoun sets (ako/ko/akin), existentials may/mayroon/wala, linker na/-ng, po/opo and kayo/ninyo.
 U2 Araw-araw: daily routine and habits. Grammar: actor focus -um- vs mag-, all three aspects, time expressions (tuwing, palagi, minsan), enclitics na/pa/lang/rin.
 U3 Sa tingin ko…: likes, wants, opinions. Grammar: pseudo-verbs gusto/ayaw/kailangan/dapat/puwede/kaya + ng/na complements; opinion frames (sa tingin ko, para sa akin, sa palagay ko); reasons and results (kasi, dahil, kaya, kaya naman); contrast (pero, kaso, kahit).
 U4 Kuwento: telling stories in completed aspect. Grammar: completed aspect across focus types, sequencing (tapos, saka, pagkatapos, nang, habang), reported speech daw/raw.
 U5 Mga plano: plans and intentions. Grammar: contemplated aspect, balak/plano, para/upang, kung (if/when), sana.
 U6 Focus in depth: object/locative/benefactive/instrumental focus (-in, i-, -an, ipag-, ipang-); choosing focus by what is definite or topical.
 U7 Abilities and causes: maka-/makapag-, ma- (non-volitional/abilitative), pa-/ipa-/magpa- causatives.
 U8 Hypotheticals and conditionals: kung…sana, sana + completed, kapag/pag, baka, siguro, yata; "If I had…, I would have…".
 U9 Feelings and relationships: emotion vocabulary, naka-/nakaka-, ma- adjectives, nga/naman/pala for nuance.
 U10 Explaining and debating: abstract topics (migration, work, society, climate), concession and argument (bagaman, gayunpaman, sa kabilang banda, halimbawa, ibig sabihin), structuring a long turn.

# 4. CONTENT FILES AND SCHEMA
Content lives in `/content` as JSON (one file per unit). A zod schema validates it at build time and a build script bundles it. Adding a unit = adding a JSON file.

```ts
type Register = "neutral" | "polite" | "casual";
type ReviewStatus = "draft" | "needs_review" | "approved" | "rejected";
type Skill = "word_order" | "focus_actor" | "focus_object" | "focus_locative" | "focus_benefactive" | "focus_instrumental" | "aspect" | "markers" | "linker" | "enclitics" | "pseudo_verbs" | "existentials" | "politeness" | "connectors" | "conditionals" | "causatives" | "abilitative" | `vocab_${string}`;

interface Unit { id: string; order: number; title: string; titleEn: string; goals: string[]; skills: Skill[]; status: ReviewStatus; }
interface Chunk { id: string; unitId: string; tl: string; en: string; de?: string; notes?: string; skills: Skill[]; audio?: string; review: ReviewStatus; confidence: "high"|"medium"|"low"; source: "authored"|"tatoeba"|"llm"; sourceRef?: string; }
interface Pattern { id: string; unitId: string; name: string; explanationEn: string; formula: string; examples: { tl: string; en: string }[]; skills: Skill[]; }
interface Item { id: string; unitId: string; type: "produce"|"transform"|"chunkbuild"|"shadow"|"recognize";
  cueEn: string; cueDe?: string; instruction?: string; sourceTl?: string;   // sourceTl for transform
  answers: { tl: string; register: Register; audio?: string }[];           // >=1; include a po variant where natural
  requiredChunks?: string[]; skills: Skill[]; difficulty: 1|2|3|4|5;
  gloss?: string;  // short grammar note shown after reveal, e.g. "binili = completed, object focus of bili"
  review: ReviewStatus; confidence: "high"|"medium"|"low"; source: "authored"|"tatoeba"|"llm"; sourceRef?: string; }
interface SpeakingPrompt { id: string; unitId: string; kind: "situation"|"opinion"|"story"|"retell432"|"narrate"; promptEn: string; promptTl?: string;
  requiredChunks: string[]; modelAnswer: { tl: string; audio?: string }; targetSeconds: number; skills: Skill[]; review: ReviewStatus; }
```

CONTENT QUALITY RULES:
- You (Claude) may draft Tagalog, but LLM Tagalog is unreliable: published benchmarks show frequent aspect and word-choice errors. Mark every item you write with source "llm", review "needs_review" and an honest confidence. Use "low" for idioms, particle nuance, rare affixes, causatives and anything you are unsure of.
- Build an in-app Review Queue screen. It shows needs_review items one at a time with Approve / Edit (inline text fields) / Reject. Store edits as local overrides in IndexedDB and include them in the export, so I can paste them back into the JSON. Never schedule rejected items or unreviewed low-confidence items. Unreviewed medium/high items may be scheduled, with a small "unreviewed" badge.
- Use standard Filipino per the KWF Ortograpiyang Pambansa: correct ng vs nang; hyphen (gitling) in mag-aral, pag-asa, halo-halo; common loanword spellings as actually used (kompyuter, trabaho). Keep it conversational, not purist. Avoid heavy Taglish in model answers, but allow established loanwords.
- Wherever an elder or stranger context is plausible, add the po/opo (and kayo/ninyo) variant as a separate answer with register "polite".
- Tatoeba: allowed (CC BY 2.0 FR). Keep the sentence ID and author in sourceRef and show attribution on an About screen. Use only sentences you judge natural, and still mark them needs_review.
- Write Units 1–3 with about 50 items + 8 speaking prompts each for the MVP. Quality over quantity.

# 5. AUDIO STRATEGY (model pronunciations)
- iOS has no on-device Tagalog TTS, so use pre-generated or recorded files:
  a. Phase 2 build-time script `/scripts/tts/generate.py` using Meta MMS-TTS Tagalog (Hugging Face "facebook/mms-tts-tgl", VITS). Its licence is CC-BY-NC 4.0: OK for this private, non-commercial app; add attribution on the About screen. Generate `/public/audio/{itemId}.mp3` (or AAC .m4a), mono, about 32–48 kbps. Check that ffmpeg is installed and install it if not.
     CLOUD NOTE: Hugging Face is not on this cloud environment's default network allowlist. Before running the script, tell me that I need to either (1) switch the environment to Custom network access and add huggingface.co plus the download hosts named in the error message (keeping the default package-manager list), or (2) run the script on my own computer. Also check that the model fits the VM (about 4 vCPU / 16 GB RAM) and that each command stays under the time limits (batch the work). If the voice quality is poor, I may skip it.
  b. In-app "Record reference" mode: I (or a family member) record reference audio for any item. Store it in IndexedDB and prefer it over generated audio.
  c. Items without audio still work (text-only reveal).
- Precache the audio for the MVP units. Keep total audio under 40 MB.

# 6. PROGRESS TRACKING SPEC
- FSRS per item via ts-fsrs (npm, MIT). Store card state per item id. Desired retention defaults to 0.90 (a setting). Ratings come from the self-rating buttons. Defaults: 10 new cards/day, max 60 reviews/day.
- Skill mastery: every completed item adds an observation to each relevant skill (checklist row ticked = success). Mastery = an exponentially weighted success rate (half-life about 20 observations) plus the observation count. Display it as 5 levels: Bago, Natututo, Kaya na, Sanay, Bihasa. The 2 weakest skills bias the next session's pattern drill (deliberate practice).
- Speaking log: seconds recorded per day and per task type. 4/3/2 rounds store their duration and an optional self-counted word count, giving a WPM trend.
- Recordings: saved locally as Blobs in IndexedDB with metadata (itemId, date, duration, mimeType). Keep the latest 3 per item, all 4/3/2 sessions from the last 30 days, and anything starred. Show storage usage via `navigator.storage.estimate()`. Warn above 300 MB and offer a one-tap "clean old recordings".
- Streak and daily goal: a day counts when the goal is met (default: 3 min of recorded speaking + all due reviews done, or 10 min total). 2 streak-freeze tokens; earn one per 7-day streak, max 2. The day ends at local midnight (Europe/Berlin).
- History view: calendar heatmap of speaking minutes, mastery bars per skill, a WPM chart for retells (simple SVG, no chart library), and a list of recent recordings with playback.
- Backup: Export JSON (all progress, FSRS states, overrides and settings) via the share sheet or a download. Recordings optional, as a separate .zip or base64 JSON; ask me which. Import validates the file and shows a confirmation dialog. Show an in-app banner reminding me to export every 14 days.
- On first launch in standalone mode, call `navigator.storage.persist()` and show the `persisted()` status in Settings. If the app is opened in a Safari tab (not standalone), show a banner: "Install to Home Screen. Data in Safari tabs can be deleted after 7 days and is separate from the installed app."

# 7. SPEAKING FEATURE SPEC
- Recording: call `navigator.mediaDevices.getUserMedia({audio:true})` only when the user taps Record. Use MediaRecorder with a feature-detected mimeType (iOS Safari typically supports audio/mp4) and stop all tracks right after recording. Handle NotAllowedError with a friendly screen explaining where to allow microphone access in iOS Settings. Big tap-to-record button, visible timer, simple level meter (AnalyserNode).
- iOS quirks to design around:
  - NO hash-based routing: changing the URL hash in standalone mode can revoke mic permission (WebKit bug 215884).
  - Handle capture failures (track "ended" events) with a "Tap to retry".
  - Audio playback must start from a user gesture.
- Compare with the model: after recording, show the model answer text + gloss, with buttons Play mine / Play model / A-B (mine, then model). Then the checklist (section 2) and Again/Hard/Good/Easy.
- Speaking rubric for open tasks (each scored 1–4 and stored):
  - Fluency (few long pauses)
  - Grammar (focus/aspect/enclitics)
  - Range (used the required chunks and connectors)
  - Filipino-only (no English fallback)
  The average maps to the FSRS rating for the prompt.
- 4/3/2 mode: countdown ring, auto-stop at the time limit, show each round's duration, optional "count your words" step after listening back.
- STT: none in Phases 1 and 2. Phase 3 optional experiment only (section 11): Whisper tiny/base via transformers.js WASM in a Web Worker. The model is downloaded once on Wi-Fi after explicit opt-in, the transcript is labelled "rough transcript, may be wrong", and it is never used for scoring.
- Clear in-app statement (on the About screen and before the first speaking task): "Salita cannot check your grammar automatically. You are the judge: compare with the model and be honest."
- Future AI hook: define `interface AssessmentProvider { id: string; available(): Promise<boolean>; assess(input: { audio?: Blob; transcript?: string; item: Item | SpeakingPrompt }): Promise<{ feedback: string; suggestedRating?: 1|2|3|4; corrections?: string[] }> }` with only a LocalSelfAssessment implementation now. Do not build any network code.

# 8. MASCOT SPEC
- An original Philippine tarsier character, built from inline SVG components (no raster images) and designed by you from scratch:
  - oversized round eyes (its signature), small body, long thin tail, gripping fingers
  - simple flat shapes in 2–3 colours from the app palette (warm brown/caramel fur, soft cream belly, deep brown eyes)
  It must look like a generic cute tarsier: original, not resembling any existing brand, app, restaurant or commercial mascot. No logos, uniforms or branded accessories.
- Suggested name: "Mata" (Filipino for "eye", after the tarsier's huge eyes). Ask me to confirm.
- States (separate SVG variants, or props that change eyes, ears, mouth and arms):
  - happy
  - encouraging (fingers up)
  - thinking (eyes looking up, hand to chin)
  - celebrating (arms up, small confetti)
  - sleepy / streak at risk (half-closed eyes, drooping ears)
  - surprised (for "Again" ratings: kind, never mocking)
- Placement: home screen greeting, small in the corner after each exercise, session summary, streak screen, empty states (no due cards, empty review queue), error screens. Tiny CSS animations only (blink, bounce); respect prefers-reduced-motion.
- Short Filipino lines, with the English shown on tap: "Kaya mo 'yan!", "Ayos!", "Sige pa!", "Inaantok na ako… mag-practice tayo?" Mark these needs_review too.
- Generate the app icons (180×180 apple-touch-icon, 192/512 manifest icons, maskable) from the mascot SVG.

# 9. UI/UX FOR IPHONE
- Visual style (my design system):
  - cream background, deep ink text, teal as the primary accent, oxblood and amber for highlights and states (oxblood = "Again"/errors, amber = streak and celebration)
  - fonts: IBM Plex Sans for UI, IBM Plex Mono for timers and numbers, Newsreader (serif) for Tagalog sentences and model answers
  - self-host the fonts as subset woff2 files via @fontsource packages (OFL), font-display: swap, system fallback
  - dark mode: deep charcoal/teal background with cream text, same accents
- Standalone: manifest display "standalone", apple-touch-icon (180×180), theme-color for light and dark, viewport-fit=cover, env(safe-area-inset-*) padding top and bottom (Dynamic Island, home indicator).
- Thumb-first: primary actions in the bottom 40% of the screen, tap targets ≥ 44 pt. Bottom tab bar: Today, Units, Progress, Settings. The Review Queue is reachable from Units and Settings.
- Dark mode via prefers-color-scheme plus a manual override. Minimal text on screens; grammar notes collapsed by default.
- Haptics: iOS Safari does not support the Vibration API, so do not depend on it. Feature-detect `navigator.vibrate` and no-op if it's missing. Use visual feedback, a short subtle sound and mascot reactions instead.
- Prevent accidental zoom and overscroll bounce on the session screen. Use ≥ 16px font in inputs to avoid iOS auto-zoom.
- Performance: initial JS under 200 KB gzipped (fonts excluded), first load under 2 s on 4G, instant start offline.
- Accessibility: VoiceOver labels on buttons, sufficient contrast in both themes, reduced motion.

# 10. TECH STACK AND ARCHITECTURE
- Vite + React + TypeScript (strict). Reason: mature, small enough, and you generate it most reliably. No Redux: React state + small hooks. No router library: a simple in-memory screen state (avoid hash routing, see section 7).
- Dexie (IndexedDB wrapper) for progress, FSRS cards, recordings (Blobs), overrides and settings.
- ts-fsrs for scheduling. Pin the current stable npm version and check its API before coding.
- vite-plugin-pwa (Workbox, generateSW): precache the app shell, content JSON, fonts and MVP audio. registerType "prompt", with an in-app "Update available – reload" toast. navigateFallback index.html.
- zod for content validation in a build script; vitest for unit tests of scheduling, mastery, the session builder and import/export.
- Approved dependencies: react, react-dom, vite, typescript, dexie, ts-fsrs, vite-plugin-pwa, zod, vitest, @fontsource/ibm-plex-sans, @fontsource/ibm-plex-mono, @fontsource/newsreader. Ask before adding anything else.
- Folder structure:
  ```
  /content/units/u01-ako.json …        (source content)
  /scripts/build-content.ts             (validate + bundle)
  /scripts/tts/generate.py              (Phase 2, optional MMS-TTS)
  /public/audio/                        (generated audio)
  /public/icons/                        (app icons generated from the mascot SVG)
  /src/app/                             (App.tsx, screens.ts)
  /src/screens/                         (Today, Session, Units, UnitDetail, Progress, ReviewQueue, Settings, About)
  /src/exercises/                       (ProduceSentence, Transform, ChunkBuild, SpeakTask, Retell432, Shadow, Recognize)
  /src/speech/                          (recorder.ts, player.ts, AssessmentProvider.ts)
  /src/srs/                             (fsrs.ts, sessionBuilder.ts, mastery.ts)
  /src/db/                              (dexie.ts, backup.ts)
  /src/mascot/                          (Mascot.tsx, states/*.tsx)
  /src/content/                         (types.ts, loader.ts)
  /docs/SPEC.md                         (this prompt)
  /.github/workflows/deploy.yml         (GitHub Pages deploy)
  CLAUDE.md, README.md
  ```
- Deployment: the GitHub Actions workflow builds and deploys to GitHub Pages on push to `main`. HTTPS is automatic (required for the mic and the service worker).
- Install steps, printed in the README and on the About screen:
  (1) Open the GitHub Pages URL in Safari on the iPhone.
  (2) Wait for the "Ready offline" indicator.
  (3) Share → "Add to Home Screen" → Add.
  (4) From now on, open the app ONLY from the icon.
  (5) On first launch, allow persistent storage and the microphone when asked.
  (6) Export a backup regularly from Settings.
- Reminders (no server = no scheduled push):
  (a) an "Add daily reminder to Calendar" button that downloads a recurring .ics event linking to the app URL
  (b) README instructions for an iOS Shortcuts Personal Automation (Time of Day → Open URL)
  Do not implement Web Push.

# 11. PHASED BUILD PLAN
PHASE 1 – MVP (this session):
 - App shell, PWA install/offline support, banner when not in standalone mode, persist() request.
 - Content pipeline, Units 1–3 (about 50 items + 8 prompts each), Review Queue with overrides.
 - Exercises 1–6, the session builder (Today loop), FSRS, checklist, self-rating, skill mastery.
 - Recording, playback and A-B compare; recording retention policy; storage estimate.
 - Streak + freezes + daily goal, a simple Progress screen, Export/Import JSON.
 - Mascot with all states, app icons. About screen with attributions and the limitation statement.
 - CLAUDE.md, docs/SPEC.md, README with install steps, deploy workflow.
 Acceptance criteria (checked in the VM where possible):
  - type-check, unit tests and the production build pass
  - the bundle-size budget is met
  - the manifest and service worker are valid for installation (check with a script or a headless browser if available; Lighthouse no longer has a PWA category, so don't rely on it)
  - no recognition exercise exceeds 10% of a generated session
  - export → wipe DB → import round-trip passes in unit tests
 Real-iPhone test checklist (I do these after merging):
  [ ] Install via Add to Home Screen; launches full-screen; safe areas correct (Dynamic Island, home indicator).
  [ ] Airplane-mode test: force-quit, turn on airplane mode, open from the icon, complete a full session including recording and model-audio playback.
  [ ] Storage-persistence test: Settings shows persisted() = true; close the app for 2+ days, reopen, data intact; export → delete app → reinstall → import restores everything (except recordings if excluded).
  [ ] Mic-permission test: the first recording prompts once; deny → friendly recovery screen; allow → record 60 s and play back; switch screens and record again with no new prompt and no failure.
  [ ] Update test: you push a change, I merge it, I reopen the app, the "Update available" toast works and data is intact.
  [ ] Dark mode, reduced motion, VoiceOver labels.
 After Phase 1: update CLAUDE.md, tell me exactly what to merge, when to set the Pages source, the URL to open, and the checklist above. Then STOP.

PHASE 2 (only when I ask): Units 4–6 content; NarrateMyDay + ThinkAloud; WPM trend chart; recordings export (.zip); calendar reminder .ics; MMS-TTS audio for all approved items (see the cloud note in section 5); a "weak skills" session mode.
 Acceptance: weak-skill sessions measurably draw from the lowest-mastery skills; audio exists for ≥ 90% of approved items.

PHASE 3 (optional experiments, ask first): Units 7–10; Whisper tiny/base WASM rough transcript (opt-in, downloaded once, memory-safe, disabled if loading fails); AssessmentProvider stub for a future online AI module (no implementation without my approval).
 Acceptance: the app stays fully usable with the experiments off; no crash if the model fails to load on the iPhone.

# 12. WORKING RULES FOR YOU (CLAUDE CODE)
- Before coding, show me in the chat: a one-page plan, the final folder tree and 10 sample items from Unit 1 for my review. Wait for my OK.
- Ask me before:
  - adding any dependency not on the approved list
  - changing the stack
  - running the TTS script
  - final mascot name and colours
  - changing session defaults
  - anything touching stored data formats (include a schema version field + migration)
- Keep it small: under 5,000 lines of app code for Phase 1. No premature abstractions, no state-management libraries, no backend, no analytics, no i18n framework (UI in English; Tagalog only in content).
- Write tests for the FSRS wrapper, mastery, the session builder and backup import/export.
- Commit in small, logical steps with clear messages, and push to your working branch.
- After each phase, give me the test checklist and say exactly what I need to do on GitHub and on the iPhone.
- Be honest: if something doesn't work on iOS Safari, or can't be checked from this VM, say so and propose the simplest fallback.
