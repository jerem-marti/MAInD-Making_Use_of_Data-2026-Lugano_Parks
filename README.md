# Green Spaces of Lugano

A small data-visualisation website about how Lugano's parks are perceived
through their Google reviews. Designed to be projected during in-person,
facilitator-led group discussions about public space.

## What's in this repo

The project is split into two acts that share one Vite app:

- **Act I — scroll-driven** (six beats). React + TS, this is the
  current build target.
- **Act II — click-driven** (View B word network, View C compare). The
  Phase 3 prototype lives in `src/network/`, `src/ui/`, `src/main.ts`
  and reads `public/data/parks.json`. It is parked: the React entry
  (`src/main.tsx`) does not load it, but the code is intact and can be
  re-attached when Act II returns to active development.

## Running

```bash
npm install
npm run preprocess   # xlsx → JSON, run once after changing data
npm run dev          # Vite dev server (Act I React app)
```

## Project structure

```
.
├── data/parks_analysis_V2.xlsx          # source data (don't edit)
├── design-system/                        # Phase 2 design handoff (read-only reference)
├── public/data/parks.json                # rich shape for Act II network (Phase 3)
├── scripts/preprocess.ts                 # xlsx → all JSON outputs
├── src/
│   ├── App.tsx                           # six pinned ScrollSections, one per beat
│   ├── main.tsx                          # React entry
│   ├── data/
│   │   ├── parks.json                    # Act I per-park summary
│   │   ├── excerpts-pool.json            # 90 short distinct excerpts for Beat 01 fragments
│   │   └── types.ts                      # types shared with Phase 3
│   ├── components/
│   │   ├── shared/
│   │   │   ├── ScrollSection.tsx         # pinned-sticky container, exposes 0..1 progress
│   │   │   ├── Blob.tsx                  # six-lens breathing aura
│   │   │   └── LensSwatch.tsx            # category dot + label + count
│   │   ├── Beat01_Opening/
│   │   ├── Beat02_Method/
│   │   ├── Beat03_Volume/
│   │   ├── Beat04_Lenses/
│   │   ├── Beat05_WorkedExample/
│   │   └── Beat06_Map/
│   ├── hooks/
│   │   ├── useScrollProgress.ts          # 0..1 progress for a pinned section
│   │   └── useReducedMotion.ts           # prefers-reduced-motion media query
│   └── styles/
│       ├── tokens.css                    # Phase 2 placeholder design tokens
│       ├── reset.css
│       └── global.css
└── screenshots/phase3/                   # Phase 3 layout-evaluation captures
```

## Tokens — handoff is the source of truth

`src/styles/tokens.css` is a thin shim that `@import`s the Phase 2
design-system handoff at
`design-system/lugano-park-small-data/project/tokens.css` and adds
motion timings (`--ease`, `--duration`, `--duration-fast`,
`--duration-slow`) which the handoff doesn't define. Components reference
handoff token names directly (`--color-bg`, `--color-text-primary`,
`--color-emotional`, …); Inter is used everywhere; the deep-forest-green
and coral/amber lens placeholders that the Phase 2 setup spec listed are
**not** used in this build — the handoff palette wins.

If the handoff palette ever changes, this file does not need to be
edited; just update the handoff `tokens.css` and every component picks
up the new values.

## Data shapes

### `src/data/parks.json` (Act I summary + Act II word network)

```ts
{
  parks: [{
    id: "ciani",
    name: "Parco Ciani",
    totalWords: 1620,                     // total mentions (row count per park)
    distinctWords: 98,
    categoryWeights: {
      experiential_emotional: 0.4611,     // proportions, sum to 1
      sensory_environmental: 0.1796,
      action: 0.2043,
      relational_context: 0.0475,
      infrastructure_amenities: 0.0969,
      tension_complaint: 0.0105,
    },
    topTerms: [{ term, category, frequency }, ... 12],
    exampleExcerpts: [string, ... 8],     // 4–16 words each, distinct
    wordNetwork: {
      nodes: [{
        id: "beautiful",
        term: "beautiful",
        category: "experiential_emotional",
        frequency: 42,
        exampleExcerpt: "first source context excerpt for this term",
      }, ...],                             // frequency >= 2 only
      edges: [{ source, target, weight }, ...],
    },
  }, ...]
}
```

`wordNetwork` is precomputed by `npm run preprocess` from
`data/parks_analysis_V2.xlsx`; the frontend should consume this JSON only and
never parse xlsx. Co-occurrence edges are unordered/deduplicated and are kept
only when both endpoints survive the `frequency >= 2` node filter.

### `src/data/excerpts-pool.json`

A flat array of ~90 short distinct excerpts (4–16 words), pulled from
all five parks via round-robin. Used by Beat 01 for drifting fragments.

### `public/data/parks.json` (Act II rich shape)

The per-park network with `nodes` and `edges` for the Phase 3 force
layout. Untouched by Act I.

## Decisions worth reviewing

1. **Two parallel token systems.** Created Act I tokens per the setup
   spec without overwriting the handoff tokens. Long-term these need
   to merge.
2. **Park IDs use the place name only, kebab-case** (`ciani`, `tassino`,
   `san-michele`, `paradiso`, `lambertenghi`) — i.e. `Parco Panoramico
   Paradiso` becomes `paradiso` since "paradiso" is the unique
   distinguisher. The Act II rich shape uses the longer slug
   (`parco-panoramico-paradiso`) for historical reasons.
3. **Top 12 terms per park** in `topTerms`. Adjustable in
   `scripts/preprocess.ts` via `TOP_TERMS_PER_PARK`.
4. **Excerpts pool round-robins across parks** so it isn't dominated by
   the largest park. Pool size is currently 90; the spec asked for 30+.
5. **Mojibake table extended; further extension deferred.** The
   preprocessor now fixes the common Italian-vowel mojibakes (`√©` →
   `é`, etc.) plus the punctuation set we have observed (`‚Ä¶` → `…`,
   `‚Äô` → `’`, smart quotes, en/em dashes). All of these are
   Mac-Roman → UTF-8 round-trip artefacts of the same shape. Emoji
   mojibakes (`üòç` and similar) remain — extending the table to cover
   the full set is deferred to when we have the full corpus.
6. **Phase 3 View B network is parked, not deleted.** It still works
   if you re-point `index.html` at `/src/main.ts`. Worth noting before
   anyone "cleans up unused files".
