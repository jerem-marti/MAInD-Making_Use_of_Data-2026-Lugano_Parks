# Phase 2 — Claude Design Prompts

> Run each prompt in a **fresh Claude design session**. Don't chain components in one conversation — context bleed makes later components inherit decisions from earlier ones.
>
> **Always paste `DESIGN_SYSTEM.md` first**, before sending the component prompt. Wait for confirmation that Claude design has read it. Then send the component prompt.

---

## Session opener (paste this first, every session)

```
I'm going to share a design system document for the project we're working on. 
Read it carefully. After you've read it, confirm by:

1. Naming the project and its target context (the "room")
2. Listing all six category colours (lens name + hex)
3. Listing the four typography registers
4. Stating the background colour

Do not generate any visual output yet. Just confirm comprehension.

[paste DESIGN_SYSTEM.md content here]
```

Once Claude design confirms by repeating those four items correctly, send the component prompt below for whichever component you're working on.

If Claude design gets any of the four items wrong, paste the document again with: *"You misread X. Re-read sections 2, 3, and 4."* — don't proceed until comprehension is verified.

---

## Prompt 1 — Design system reference sheet

> **Goal:** Generate a single visual reference document showing all locked tokens. This becomes the team's printable / shareable artefact.

```
Component: Design system reference sheet — visual inventory of all locked tokens.

Generate a single artifact, vertical layout, 720px wide, on the project 
background colour (--color-bg #FAF7F2). Generous whitespace, no decorative 
elements, no card containers — only 0.5px hairlines (--color-border-light) 
between sections.

REQUIRED SECTIONS, IN THIS ORDER

1. PALETTE
   For each of the six lens colours, show:
   - A 120 × 80 swatch in the colour
   - The hex code in `data-s` style below the swatch
   - The lens name in `body` style below the hex
   - The 1-line gloss in `body-s` style with `--color-text-tertiary`, 
     below the name
   
   Below the six lens swatches, show the four neutrals 
   (--color-bg, --color-text-primary, --color-text-secondary, 
   --color-border-light) in the same format.

2. TYPOGRAPHY
   Show every type token from the design system, each rendered with real 
   example text:
   
   Display register:
   - display-hero (48 / 500 / -0.02em): "Green spaces of Lugano"
   - display-l   (32 / 500 / -0.02em): "Eight parks. Eight auras."
   - display-m   (22 / 500 / -0.01em): "Parco Ciani"
   - display-s   (18 / 500 / -0.01em): "Parco Lambertenghi"
   
   Body register:
   - body-l (18 / 400 / 1.6):  "This is the most personal lens. It captures 
                               the inner state of the visitor — the emotional 
                               residue left by a park visit."
   - body   (15 / 400 / 1.7):  "Across all reviewed words from all five parks, 
                               only about 2% belong to the Tension–Complaint 
                               lens."
   - body-s (13 / 400 / 1.65): "Beautiful park, with a lakeside walk and 
                               green areas full of tulips"
   
   Structure register:
   - label    (11 / 500 / 0.10em / UPPER):  "REVIEWED WORDS"
   - label-s  (10 / 500 / 0.12em / UPPER):  "2 OF 5"
   - nav      (13 / 500 / 0.02em):          "Compare all five"
   - nav-link (13 / 400 / 0.02em):          "← Back to map"
   - category (11 / 500 / 0.04em / lower):  "● emotional"
   
   Data register:
   - data-l (32 / 500 / -0.02em):  "3,460"
   - data-m (22 / 500 / -0.01em):  "1,620 reviewed words"
   - data-s (13 / 500):            "Used 292 times"
   
   To the LEFT of each example, show the token spec in `--color-text-tertiary`, 
   label-s style: "display-l · 32 / 500 / -0.02em / 1.15"

3. SPACING
   A horizontal row of solid bars showing 4px / 8px / 16px / 24px / 32px / 
   48px / 64px / 96px. Each bar's width matches its value. Below each, the 
   token name (--space-1, --space-2, etc.) and value in label style.

4. PRIMITIVES
   Show one example each of:
   - Tag pill (with each of the six lens dots)
   - Primary button: "Compare all five"
   - Inline link: "← Back to map"
   - Stat block: "1,620 reviewed words / 98 distinct words"

ANTI-REQUIREMENTS
- No logos
- No project-name treatment beyond the display-hero example  
- No preview of any component (cards, headers) — primitives only
- No decorative elements, no illustrations, no icons beyond functional ones
- No gradients or shadows on any element

Generate this once. No variants for this prompt — it's a reference, not 
exploration.
```

---

## Prompt 2 — Six category cards (Beat 04)

> **Goal:** The comprehension hinge of Act I. After scrolling through these, the user understands the colour system that drives everything downstream.

```
Component: Six category cards for Beat 04 of the scrolly-telling sequence.

CONTEXT
After Beat 02 ("we collected Google reviews and translated them"), Beat 04 
introduces the six lenses through which every word will be sorted. The user 
scrolls through six full-card sections, one per lens. Each card occupies 
roughly 70% of viewport height during scroll. After this beat, the user 
should recognise each lens by colour and meaning.

CARD STRUCTURE (each of the six cards)

Layout: 960px wide, 480px tall, on --color-bg.

Left third (480px wide):
- Vertical 4px-wide bar in the lens hex colour, full height of the card, 
  flush against the left edge.
- 64px right of the bar: the lens index in `label` style, 
  e.g. "LENS 01" — colour: the lens hex, NOT --color-text-tertiary
- 12px below: the lens name in `display-l` style, in --color-text-primary
- 8px below: the gloss in `body-l` style, --color-text-secondary
  (e.g. "how a place made someone feel")
- 32px below: two paragraphs of explanatory copy in `body` style, 
  --color-text-secondary, ~50 words each, separated by 16px gap

Right two-thirds (480px wide):
- Background: a wash of the lens hex at 8% opacity covering the entire 
  right portion. Soft edge where it meets the left half (a single 0.5px 
  vertical hairline of --color-border-light).
- Centred vertically inside the wash:
  - Five English example words, in `display-s` style (18 / 500 / -0.01em), 
    in the FULL lens hex colour, separated by middle dots " · "
  - 16px below: the same five words in Italian, in `body` style 
    (15 / 400), in --color-text-tertiary, separated by middle dots

LENS CONTENT — produce all six in order

01. Experiential–Emotional · #B8A4F0
    Gloss: "how a place made someone feel"
    EN: beautiful · peaceful · wonderful · relaxing · magical
    IT: bello · tranquillo · meraviglioso · rilassante · magico
    Para 1: "This is the most personal lens. It captures the inner state of 
    the visitor — the emotional residue left by a park visit. Not what was 
    there, but what it did to you."
    Para 2: "When someone calls a park magical or peaceful, they aren't 
    describing a feature. They're describing a transformation. This lens 
    listens for exactly that."

02. Sensory–Environmental · #5FE3A8
    Gloss: "what it looked, sounded, smelled like"
    EN: green · quiet · clean · shaded · view
    IT: verde · silenzioso · pulito · ombreggiato · vista
    Para 1: "Before you have time to form a feeling, your senses are already 
    at work. This lens captures the raw perceptual character of a park — its 
    palette, its soundscape, its textures."
    Para 2: "It's the difference between arriving somewhere and landing 
    somewhere. The air, the light, the quiet that tells you immediately what 
    kind of place this is."

03. Action · #6BD8EF
    Gloss: "what people did there"
    EN: walk · relax · picnic · visit · play
    IT: passeggiare · rilassarsi · picnic · visitare · giocare
    Para 1: "Some parks are experienced passively. Others are experienced in 
    motion. This lens captures the kinetic dimension — the activities and 
    practices that make a park what it is."
    Para 2: "A high Action weight is the signature of a park that's used, 
    not just visited. People don't pass through; they walk, picnic, 
    photograph, play."

04. Relational Context · #F0CD3D
    Gloss: "who was there, who it's for"
    EN: children · families · couples · dogs · groups
    IT: bambini · famiglie · coppie · cani · gruppi
    Para 1: "A park is not just a place — it's a social context. This lens 
    listens for the people in the picture: who's writing the review, who they 
    brought, who they noticed around them."
    Para 2: "It tells you whether a park belongs to families with strollers, 
    to elderly locals on a regular bench, or to tourists passing through. 
    That social identity shapes the experience as much as the landscape does."

05. Infrastructure–Amenities · #A8B8C8
    Gloss: "what was physically there"
    EN: bench · playground · trees · path · fountain
    IT: panchina · parco giochi · alberi · sentiero · fontana
    Para 1: "This is the most concrete of the six. It names the things that 
    are actually there — benches, fountains, playgrounds, paths. The physical 
    fabric of the park."
    Para 2: "A high Infrastructure weight often signals a park well-equipped 
    and frequently used for specific purposes — or a park whose physical 
    distinctiveness makes it memorable enough to mention."

06. Tension–Complaint · #9A8BA8
    Gloss: "what disappointed"
    EN: dirty · crowded · neglected · broken · noisy
    IT: sporco · affollato · trascurato · rotto · rumoroso
    Para 1: "No park is perfect, and honest portraits require acknowledging 
    the friction. This lens captures the negative signals — the crowding, 
    the neglect, the small failures that chip away at the experience."
    Para 2: "A park with very low Tension is genuinely exceptional. Most 
    have some, and that matters. Suppressing it would make the aura a 
    flattery, not a portrait."

DELIVERABLE
All six cards stacked vertically with 32px gap between cards. Each card at 
full fidelity. Single layout, no variants.

ANTI-REQUIREMENTS
- No icons next to lens names
- No "learn more" affordances
- No progress indicator (the scroll handles this)
- No italic on the Italian words (we don't use italic at all)
- No gradient on the wash — flat 8% opacity fill
- No card border, no shadow, no rounded card edges (the cards are 
  full-bleed sections in the scroll, not cards in the UI sense)
```

---

## Prompt 3 — View B header strip (with explicit variants)

> **Goal:** The header above each park's word network. It identifies the park, summarises its scope, anchors the aura visually, and provides navigation.

```
Component: View B sticky header strip — the header above each park's word 
network in Act II.

CONTEXT
Act II is non-scrolling. The user navigates between Map ⇄ Park ⇄ Compare 
via clicks. This header sits above the word network canvas (canvas not 
part of this design — just a 200px-tall blank rectangle below the header to 
show the relationship). The header is sticky, always visible. Total header 
height: target 96–120px depending on variant.

REQUIRED ELEMENTS

Top-left: "← Back to map" link in `nav-link` style.

Top-right: "Compare all five" button in primary button style (0.5px border 
--color-text-primary, --radius-md, padding 9px 18px, no background fill, 
text in `nav` style).

Centre area, key elements:
- Park name "Parco Ciani" in `display-m` style 
  (22 / 500 / -0.01em / --color-text-primary)
- Cycle arrows ← → flanking the park name. Arrows are 24px glyphs in 
  --color-text-secondary, hover state --color-text-primary, with 44×44px 
  hit areas.
- Subtitle line below park name: "1,620 reviewed words · 98 distinct words" 
  in `body-s` style (13 / 400 / --color-text-secondary). The numbers may 
  optionally use weight 500 to match data register; designer's call.
- Position indicator below subtitle: "2 of 5" in `label-s` style 
  (10 / 500 / 0.12em / UPPERCASE / --color-text-tertiary)

Aura thumbnail:
- 64px diameter circular blob composed of six lens colours blended softly. 
- For Parco Ciani, approximate composition: 46% emotional (#B8A4F0), 
  20% action (#6BD8EF), 18% sensory (#5FE3A8), 10% infrastructure (#A8B8C8), 
  5% relational (#F0CD3D), 1% tension (#9A8BA8).
- Soft blended edges, no visible wedges or pie segments.
- Non-clickable. It's an anchor, not a control.

Below the entire header strip:
- A 0.5px hairline (--color-border-light) separating it from the canvas 
  area below
- A blank rectangle 200px tall labelled "[ word network canvas ]" in 
  `label-s` style (centred, --color-text-quaternary) — just to show the 
  relationship, no fidelity needed on canvas contents

VARIANTS — produce three

Vary the relationship between navigation chrome and park-identity block. 
All locked tokens must be respected in every variant.

VARIANT A — Symmetrical
Back link top-left, Compare button top-right (separated row from identity).
Park identity centred on a second row: cycle arrow + park name + cycle 
arrow, then aura thumbnail to the right of the subtitle column.
Most balanced. Tallest variant (~120px).

VARIANT B — Identity-forward
Park name dominates the top row, centre-left, with cycle arrows immediately 
around it. Aura thumbnail inline with the park name, on the far right of 
the top row. Back link and Compare button are smaller, on a second row, 
left and right justified.
Identity-led. Medium height (~108px).

VARIANT C — Compact single-row
All elements in a single row, target ~64px tall. Order left to right: 
back link · cycle arrow · park name · cycle arrow · subtitle (inline, 
separated by middle dot) · position indicator · aura thumbnail · compare 
button.
Tighter, less breathing room. Tests whether the header can be slim.

For each variant:
- Render at full fidelity, 1200px wide
- Label it (A, B, C) above the mockup in `label` style
- Add one line below in `body-s` describing the trade-off

Use real data: park name "Parco Ciani", subtitle "1,620 reviewed words · 
98 distinct words", position "2 of 5".

ANTI-REQUIREMENTS
- No tabs (parks are not tabs — they're cycled through)
- No dropdown for park selection (cycle arrows are the navigation)
- No progress bar across parks (the "2 of 5" handles this)
- No back arrow icon on the cycle buttons — use simple ← → glyphs
```

---

## Prompt 4 — View C compare layout (with explicit variants)

> **Goal:** The Compare-all-five screen — the visual prompt for the central debate of the discussion.

```
Component: View C — the Compare-all-five screen.

CONTEXT
Triggered from the "Compare all five" button on View A (the map). Appears 
as a modal-style overlay, with the map dimmed (~40% opacity) and slightly 
blurred behind it. The user knows they haven't left — they're looking at a 
different reading of the same data. This is the screen a facilitator uses 
to ask "which two parks look most alike? which one isn't like the others?"

REQUIRED ELEMENTS

Top of modal:
- Close affordance "×" in the top-right corner. 24px, 
  --color-text-secondary, hover --color-text-primary. 44×44 hit area.

Header block (below close):
- Label "ALL FIVE AURAS, SIDE BY SIDE" in `label` style
- 12px below: subtitle in `body` style, --color-text-secondary:
  "Sized equally on purpose. With volume removed, only the colours speak."
- 64px gap below the subtitle to the row of stations

Main row — five park stations, side by side, equally spaced

Each station contains, vertically stacked:

1. Size-indicator microbar (above the aura)
   - A horizontal line whose width is proportional to the park's review 
     volume. Line height: 2px. Colour: --color-border-medium.
   - Calculate widths so Ciani is the longest. Suggested widths at the 
     given variant scale: Ciani 100%, Tassino 53%, San Michele 34%, 
     Paradiso 23%, Lambertenghi 4%.
   - Below the line, 4px gap, the count in `label-s` style, 
     --color-text-tertiary: "1,620 words" / "856 words" / "550 words" / 
     "369 words" / "65 words"
   - 16px gap below the count to the aura

2. Aura blob (the centrepiece of each station)
   - Fixed size: 180 × 180px in Variant A (generous), 140 × 140px in 
     Variant B (dense). All five auras the same size in each variant.
   - Composed of the six lens colours in proportions specific to each park 
     (see compositions below).
   - Soft blended edges, no wedges, breathing animation indicated visually 
     by a faint outer halo (since this is a static mockup, just imply 
     softness).
   - 24px gap below the blob to the park name

3. Park name in `display-m` style, --color-text-primary, centred under the 
   blob. 24px gap below.

4. "TOP WORDS" label in `label` style. 8px below.

5. Three top words, vertically stacked, each in `body` style, 
   --color-text-primary, 4px between lines.

6. 16px gap, then "DOMINANT LENS" label in `label` style. 8px below.

7. A single category pill (using the tag-pill primitive from the design 
   system): coloured dot in the dominant lens hex + lowercase lens name.

Bottom strip — discussion prompts

- Separated from the main row by a 0.5px hairline (--color-border-light), 
  with `--space-7` (48px) of padding above and below the hairline.
- Three discussion questions, each in `body` style, 
  --color-text-secondary, each preceded by an em-dash:
    — Which two parks look most alike?
    — Which one isn't like the others?
    — What's the same across all five?

PARK COMPOSITIONS

Use these proportions for the auras:

Ciani:        Emotional 46% · Sensory 18% · Action 20% · Relational 5%  · Infra 10% · Tension 1%
Tassino:      Emotional 41% · Sensory 21% · Action 15% · Relational 9%  · Infra 12% · Tension 3%
San Michele:  Emotional 49% · Sensory 22% · Action 13% · Relational 2%  · Infra 13% · Tension 2%
Paradiso:     Emotional 43% · Sensory 22% · Action 11% · Relational 9%  · Infra 13% · Tension 1%
Lambertenghi: Emotional 28% · Sensory 11% · Action 11% · Relational 28% · Infra 22% · Tension 2%

PARK DATA

Ciani         · 1,620 words · top: beautiful, walk, relax    · dominant Emotional
Tassino       ·   856 words · top: beautiful, nice, picnic   · dominant Emotional
San Michele   ·   550 words · top: beautiful, view, quiet    · dominant Emotional
Paradiso      ·   369 words · top: beautiful, view, children · dominant Emotional
Lambertenghi  ·    65 words · top: children, sports, play    · dominant Relational

Order parks left to right by review volume descending:
Ciani · Tassino · San Michele · Paradiso · Lambertenghi.
This puts Lambertenghi at the right edge as the natural punchline.

VARIANTS — produce two

VARIANT A — Generous (default)
- Modal width: 1280px, padding 64px on all sides
- Aura size: 180 × 180px
- Generous gaps between stations and within each station
- Bottom prompt strip is its own visual zone with breathing room around 
  each question

VARIANT B — Dense
- Modal width: 1080px, padding 48px on all sides
- Aura size: 140 × 140px
- Tighter gaps between stations and within each station
- Three prompt questions inline as a single row at the bottom, separated 
  by middle dots
- Tests whether the comparison can fit on a smaller projector resolution

For each variant:
- Render the modal with a faint dimmed map ghosted behind it. Simulate 
  this with a 6%-opacity --color-text-primary overlay covering the entire 
  background, plus a few indistinct blob shapes (just enough to communicate 
  the layering — no fidelity needed on the map itself)
- Label the variant (A, B) above the mockup in `label` style
- Add one line below in `body-s` describing the trade-off

ANTI-REQUIREMENTS
- No charts of percentages next to each blob (resist the urge to make this 
  more "informative" — the blobs ARE the information)
- No "expand" or "view details" affordance on each station (clicking the 
  blob enters View B; no need to advertise it visually)
- No decorative imagery of parks themselves
- No filtering controls or sort options (the order is fixed by design)
- No "share this comparison" or export buttons
```

---

## Workflow notes

### Order of execution

1. **Prompt 1 first** (reference sheet) — validates that Claude design has internalised the system before generating any real components.
2. **Prompt 2 second** (Beat 04 cards) — validates the palette in real use.
3. **Prompt 3 third** (View B header) — small, contained, stress-tests every primitive type.
4. **Prompt 4 last** (View C compare) — the showcase. By now the system is locked in muscle memory.

### Iteration

After each component is generated, push back at least once. A useful follow-up:

> "Strip 20% of the visual elements. Whatever feels redundant or decorative, remove. Keep only what carries information."

The first generation is almost always slightly too decorated. The second pass converges on the editorial register the system requires.

### Variant evaluation

Don't pick a winner immediately. After receiving variants:

1. Screenshot them
2. Place side-by-side in a separate doc
3. For each, write one sentence: *"What does this variant cost? What does it gain?"*
4. Sit with the options for at least half a day
5. View at projector scale (1920×1080, 2 metres distance) before deciding

The winners are usually the ones that look quietest on second viewing.

### Decision logging

Each variant decision goes into a decision log (separate document, recommended format: `DECISIONS.md`). Record:

- Component
- Variants considered
- Variant chosen
- Why (one sentence)
- Date

This becomes invaluable when the team revisits a decision in three weeks and can't remember the rationale.

### Things deferred beyond Phase 2

These are intentionally NOT in any of the four prompts:

- The **breathing animation** for auras (Phase 1 prototype)
- The **word network layout** (force-directed, code-only)
- The **map base style** (needs separate decision)
- **Mobile adaptations** (locked desktop first)
- The **Beat 05 worked-example animation** (Phase 4 implementation)
- **Map (View A)** — produced after View B and C are locked, since it's the simplest screen and benefits from inheriting decisions

Don't ask Claude design to generate any of these in Phase 2.
