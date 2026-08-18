# Reading Assessment App

A Next.js application for assessing students' reading skills. A reader moves through a short intake form, a system/calibration check, a karaoke-style highlighted reading passage with an offline dictionary, and a comprehension test — while the app quietly records detailed reading behavior (timing, pauses, rereads, word lookups) for later review.

## Contents

- [Assessment flow](#assessment-flow)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Routes](#routes)
- [Reading panel features](#reading-panel-features)
- [Offline dictionary](#offline-dictionary)
- [Behavior tracking](#behavior-tracking)
- [CSV export](#csv-export)
- [Assessment visualizer](#assessment-visualizer)
- [Configuration](#configuration)
- [Known limitations](#known-limitations)

## Assessment flow

```
/  (Reader Profile + consent)
   -> /system-test  (try the controls on a short practice passage)
      -> /reading  (the real passage, tracked)
         -> /comprehension-test  (5 open-ended questions, auto-downloads CSV on submit)
```

Each "Continue" button only becomes clickable once the reader has actually read through to the end of the current passage — it isn't just a link sitting there.

## Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Zustand** for state (one store per feature, no global store)
- **Tailwind CSS v4** for styling, with a warm paper-toned design system defined in `globals.css`

## Project structure

```
src/
├── app/
│   ├── page.tsx                    Reader profile form (root route)
│   ├── system-test/page.tsx        Calibration passage + onboarding modal
│   ├── reading/page.tsx            The tracked assessment passage
│   ├── comprehension-test/page.tsx 5-question comprehension test
│   ├── visualize/page.tsx          CSV upload + heatmap visualizer
│   ├── layout.tsx, globals.css, favicon.ico
├── features/
│   ├── demographic/                Reader profile store + form
│   ├── reading/                    Reading store, ReadingPanel, ReadingSession
│   ├── dictionary/                 Dictionary store + panel (offline lookup)
│   ├── comprehension/              Comprehension answers store
│   ├── tracking/                   Behavior tracking store + CSV export
│   └── visualize/                  CSV parser for the visualizer page
├── lib/
│   ├── utils.ts                    Passage text + PROGRESSIVE_REVEAL_ENABLED config
│   └── comprehensionQuestions.ts   The 5 comprehension questions (shared)
public/
└── dictionary/
    └── passage-words.json          Offline dictionary data (see below)
scripts/
└── build-dictionary.ts             One-time script to (re)generate the dictionary data
```

## Getting started

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Routes

| Route                 | Purpose                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                   | Reader profile form: name, level, section, reading difficulties, consent checkbox (required)                                            |
| `/system-test`        | A short practice passage to try Play/Pause, speed, rewind, and the dictionary before the real assessment. Not tracked.                  |
| `/reading`            | The real passage ("The Last Light in the Library"). Tracked from the reader's first Play click.                                         |
| `/comprehension-test` | 5 open-ended questions (literal, inferential, critical, analysis, higher-order). Downloads the full CSV automatically on submit.        |
| `/visualize`          | Upload a previously-exported CSV to see a dwell-time heatmap and pause markers over the passage, plus the reader's profile and answers. |

## Reading panel features

- **Karaoke-style highlighting** — auto-advances word by word at an adjustable speed (0.5x–2.5x, via slider, ◀/▶ buttons, or Left/Right arrow keys).
- **Play/Pause** — button or Space bar.
- **Click a word** — pauses and looks up its definition in the dictionary panel.
- **Rewind** — click "← Rewind to", then click any earlier word to jump the highlight back there. Text already read stays visible and clickable even after this.
- **Progressive reveal** _(optional, see [Configuration](#configuration))_ — words ahead of the highlight are blurred and non-interactive until reached, so a reader can't skim ahead of the pace. Once revealed, a word stays revealed even after a rewind.
- **Book-style formatting** — paragraphs render with a first-line indent and the source text's original line breaks, rather than one continuous reflowed block.

## Offline dictionary

The dictionary panel does **not** call a live API. Instead, `public/dictionary/passage-words.json` holds definitions only for the words that actually appear in the passages — a tiny, purpose-built dataset rather than a general-purpose bundled dictionary.

To (re)generate it:

```bash
npx tsx scripts/build-dictionary.ts
```

This reads every passage text constant in `src/lib/utils.ts`, extracts the unique words, and looks up any word not already present in `passage-words.json` against `api.dictionaryapi.dev`. It's safe to re-run — already-resolved words are skipped, so it only fetches what's missing. Run it locally (needs real internet access) whenever you add or change passage text, then commit the updated JSON file.

The dictionary store also does light on-the-fly stemming (`asked` → `ask`, `demolished` → `demolish`, etc.) since the dataset only contains base word forms.

## Behavior tracking

Tracking is enabled only on `/reading` (not the system test) and only starts on the reader's **first Play click** — not on page load. It stops automatically once the highlight has displayed the last word for its normal duration, and reopens if the reader goes back into the text (a rewind, or replaying from the top).

What's recorded, every event with an ISO timestamp:

- **Session timing** — start/end, plus per-segment active spans (see [CSV export](#csv-export) for why there are two duration figures)
- **Pauses** — location, duration, and a `reason`: `manual` (Play/Pause), `lookup` (paused to check a word), `reread` (paused via rewind), or `finished` (idle time after reaching the end, before continuing or rereading)
- **Rereads** — every rewind, from/to word index and text
- **Dictionary lookups** — every search attempt, successful or not
- **Speed changes** — every adjustment during reading, plus whatever speed was set at the very first Play click
- **Word dwell time** — how long the highlight actually sat on each word, counting only time spent actively playing (time spent paused on a word — for any reason — is excluded, not just subtracted after the fact)

## CSV export

Triggered automatically when the comprehension test is submitted (a "Download CSV again" button is also available in the confirmation modal as a fallback). One file, several `=== SECTION ===` blocks:

```
SESSION SUMMARY            session/duration totals, initial speed
READER PROFILE             name, level, section, difficulties, consent, etc.
READING SEGMENTS           each active reading span (start/end/duration)
PAUSES                     timestamp, word, duration, reason
REREADS                    timestamp, from word/index, to word/index
SPEED CHANGES               timestamp, new speed
DICTIONARY LOOKUPS (LOG)             every lookup attempt with timestamp
DICTIONARY LOOKUPS (SUMMARY BY WORD)  aggregated counts
WORD DWELL TIME (FOR HEATMAP)        word_index, word, total_dwell_ms, visit_count
COMPREHENSION ANSWERS       question, category, prompt, answer
```

Two duration figures appear in `SESSION SUMMARY`:

- `active_reading_duration_ms` — only time spent actively reading (excludes idle gaps, e.g. sitting on the finished passage before continuing)
- `wall_clock_duration_ms` — the full span from first Play to final stop, idle gaps included

## Assessment visualizer

`/visualize` accepts one of the CSVs described above and renders:

- The passage text (reconstructed from `SAMPLE_TEXT` in `lib/utils.ts`, tokenized the same way the reading panel does, so `word_index` lines up exactly) with each word's background color interpolated from **yellow (lowest dwell time) to red (highest)**, normalized against the actual min/max found in the file. Words never reached during the session render faded instead of yellow, since "briefly seen" and "never seen" are different things.
- A `|` mark after any word with a recorded pause, colored by reason (blue=manual, purple=lookup, orange=reread, gray=finished) — multiple marks stack if a word has multiple pauses. Hover either a word or a mark for exact numbers.
- Reader profile, session summary stats, and comprehension answers, all read straight from the same file.

This page is built around the one currently-tracked passage. If more tracked passages are added later, the visualizer would need a way to know which passage a given CSV belongs to before it can reconstruct the right text.

## Configuration

Some behavior is controlled by editing code directly rather than through in-app settings:

- **`PROGRESSIVE_REVEAL_ENABLED`** in `src/lib/utils.ts` — toggles the blur-ahead-of-highlight behavior. No in-app toggle exists; flip this constant and redeploy.
- **Passage text** — `SAMPLE_TEXT` and `SYSTEM_TEST_TEXT` in `src/lib/utils.ts`.

## Known limitations

- All state (profile, tracking, comprehension answers) lives in memory via Zustand — nothing is persisted to a backend or `localStorage`. A page refresh mid-assessment loses that session's data.
- Automatic CSV download on submit relies on the browser treating it as a user-gesture-triggered download; this works in all major browsers when triggered from a form submit, but strict download-blocking settings could in theory interfere.
- The dictionary dataset only covers words actually present in the passages at the time `build-dictionary.ts` was last run — adding new passage text requires re-running the script before those new words will resolve.
