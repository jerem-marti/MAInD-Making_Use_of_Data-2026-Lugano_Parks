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

## Token review — what to refresh after visual review

`src/styles/tokens.css` was created from the **Phase 2 setup spec** with
explicitly-marked placeholder values. The design-system handoff in
`design-system/lugano-park-small-data/project/tokens.css` defines a
different set of tokens (different naming convention, different lens
palette). Both currently exist in this repo. They will eventually need
to be reconciled.

Items in `src/styles/tokens.css` that should be reviewed against the
handoff before the project ships:

| Token | Placeholder value | Handoff equivalent |
|---|---|---|
| `--lens-emotional` | `#C9663D` warm amber/terracotta | `--color-emotional` `#B8A4F0` lavender |
| `--lens-sensory` | `#5B8C7B` muted green | `--color-sensory` `#5FE3A8` mint |
| `--lens-action` | `#D9A441` citrus yellow | `--color-action` `#6BD8EF` cyan |
| `--lens-relational` | `#D88A7A` coral/peach | `--color-relational` `#F0CD3D` yellow |
| `--lens-infrastructure` | `#6B7F92` slate blue | `--color-infrastructure` `#A8B8C8` slate |
| `--lens-tension` | `#7C6F8E` dusty purple | `--color-tension` `#FF7060` coral |
| `--bg` | `#FAF8F4` | `--color-bg` `#FAF7F2` (very close) |
| `--primary` | `#1F4435` deep forest green | (no handoff equivalent — handoff uses `#1A1A1A`) |

The handoff is the source of truth long-term, but the spec asked for
the placeholder values above for Phase 2 setup. Replacement should
happen as a single sweep after visual review.

The headline serif (`Georgia`) also conflicts with the handoff, which
locks `Inter` for everything; the spec asked for Georgia in headlines
and the worked-example sentence. Confirm during visual review.

## Data shapes

### `src/data/parks.json` (Act I summary)

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
  }, ...]
}
```

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
5. **Mojibake residue in some excerpts.** The preprocessor fixes the
   common Italian-vowel mojibakes (`√©` → `é`, etc.). A small number of
   excerpts still contain other UTF-8 round-trip artefacts (e.g. emoji
   like `üòç`, ellipsis `‚Ä¶`). Beat 01 should filter these or we
   should extend the mojibake table when we know the full set.
6. **Phase 3 View B network is parked, not deleted.** It still works
   if you re-point `index.html` at `/src/main.ts`. Worth noting before
   anyone "cleans up unused files".
