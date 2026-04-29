# Green Spaces of Lugano — Design System

> **Source of truth.** This document defines every locked design decision for the project. Designers reference it when generating components in Claude design. Developers reference it when implementing in Phase 3. New collaborators read it first. If a decision isn't in this document, it isn't locked.

---

## 1. Project context

**What this is.** A small data-visualisation website about how Lugano's parks are perceived through their Google reviews. The piece is designed to be projected on a screen during in-person, facilitator-led group discussions — where a facilitator uses it to spark debate about public space, attention, and whose voice gets heard.

**What this is not.** Not a marketing site. Not an art piece. Not a SaaS dashboard. Not a personal-exploration tool.

**Aesthetic anchor.** Calm, clear, civic. Closer to a contemporary exhibition wall label or a well-made municipal data publication than to either a tech product or a poetry chapbook.

**Implication for every design decision:** if a choice would make the piece *more contemplative* but *less readable on a projector at 4 metres distance*, readability wins.

---

## 2. Foundation tokens

### 2.1 Background and surfaces

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#FAF7F2` | Warm off-white. The single canvas colour. Never pure white. |
| `--color-surface-secondary` | `#F2EEE5` | Slightly darker off-white for grouped surfaces, mini-frames, modal interiors |

### 2.2 Text colours

All solid hex. No `rgba()` transparency for text. Ever.

| Token | Hex | Contrast on bg | Use |
|---|---|---|---|
| `--color-text-primary` | `#1A1A1A` | 16.0:1 — AAA | Display, important data, primary content |
| `--color-text-secondary` | `#3A3A3A` | 10.4:1 — AAA | Body copy, default reading text |
| `--color-text-tertiary` | `#6B6B6B` | 4.6:1 — AA | Labels, metadata, captions |
| `--color-text-quaternary` | `#9A9A9A` | 2.5:1 — non-text only | Hairlines, decorative dividers, position indicators |

`--color-text-quaternary` is below AA contrast — it must never carry meaning alone. Use only where the information is also conveyed elsewhere.

### 2.3 Borders

Borders are always `0.5px solid`. The 0.5px hairline is a defining characteristic of the system — it gives editorial register without visual weight.

| Token | Hex | Use |
|---|---|---|
| `--color-border-light` | `#E5E2DB` | Default hairlines, card edges, subtle separators |
| `--color-border-medium` | `#C9C5BA` | Section breaks, emphasis hairlines, hover states |

### 2.4 Spacing scale

Multiples of 4px. Vertical rhythm steps in 16, 24, 32, 48, 64, 96px.

| Token | Value | Typical use |
|---|---|---|
| `--space-1` | 4px | Inline gaps, tight metadata stacks |
| `--space-2` | 8px | Pill padding, icon gaps |
| `--space-3` | 12px | Card internal padding, button vertical |
| `--space-4` | 16px | Standard gap between related elements |
| `--space-5` | 24px | Gap between content blocks within a section |
| `--space-6` | 32px | Padding inside cards and large containers |
| `--space-7` | 48px | Section padding, vertical rhythm of beats |
| `--space-8` | 64px | Beat-to-beat spacing in scroll |
| `--space-9` | 96px | Top/bottom of major sections |

### 2.5 Corner radii

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 4px | Small chips, tag pills (use 20px for full pills) |
| `--radius-md` | 6px | Buttons, inputs |
| `--radius-lg` | 12px | Cards, mini-frames, panels |
| `--radius-pill` | 999px | Tag pills, status indicators |

No radius greater than 12px on rectangular elements. No rounded corners on single-sided borders (when using `border-left` accents, set `border-radius: 0`).

---

## 3. Category palette (the six lenses)

The colour system is the most semantically loaded part of the project. Each colour represents one of the six lenses through which review words are categorised. The palette is bright but desaturated to sit on warm off-white without vibrating.

| Lens | Token | Hex | Hue | Used for |
|---|---|---|---|---|
| Experiential–Emotional | `--color-emotional` | `#B8A4F0` | Lavender | "How a place made someone feel" |
| Sensory–Environmental | `--color-sensory` | `#5FE3A8` | Mint | "What it looked, sounded, smelled like" |
| Action | `--color-action` | `#6BD8EF` | Cyan | "What people did there" |
| Relational Context | `--color-relational` | `#F0CD3D` | Yellow | "Who was there, who it's for" |
| Infrastructure–Amenities | `--color-infrastructure` | `#A8B8C8` | Slate-blue | "What was physically there" |
| Tension–Complaint | `--color-tension` | `#FF7060` | Coral | "What disappointed" |

### 3.1 Why this specific palette

Four luminous hues (Emotional / Sensory / Action / Relational) for the *human, perceptual* lenses. Two muted cool tones (Infrastructure / Tension) for the *material, shadow* lenses. The asymmetry teaches the user something: bright lenses are how we *experience*, muted ones are what's *there* and what's *wrong*.

### 3.2 Tension is coral

Tension–Complaint is rendered in coral (`#FF7060`). It carries a slightly hotter register than the other lenses to signal that something is off, while remaining desaturated enough to sit on the warm off-white without alarm.

### 3.3 Usage rules

- **At full saturation** (the hex above): on lens-of-the-moment elements. Active swatch. Hovered word. Aura segment. Category dot in pills.
- **At ~15% opacity** (as a wash): filling the right third of a Beat 04 lens card. Background tint behind a station's metadata block when it's hovered in View C.
- **Never** as a background fill behind body text. Body text always sits on `--color-bg` or `--color-surface-secondary`.
- **Never** as a single decorative accent. Colour appears only where it carries lens meaning.

### 3.4 Distinguishability checklist

At 7px (the typical category-dot size), the palette must remain distinguishable. Verified:

- Lavender vs. Coral: opposite ends of the wheel — no risk of confusion
- Mint vs. Cyan: different hue family (green-leaning vs. blue-leaning)
- Yellow vs. all others: unique
- Slate-blue vs. Cyan: slate is desaturated, cyan is luminous
- Slate-blue vs. Coral: different hue family and luminance

---

## 4. Typography

### 4.1 Font

**Inter, exclusively.** Two weights only.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" rel="stylesheet">
```

```css
font-family: 'Inter', sans-serif;
```

No serif anywhere. No Helvetica fallback. No font-style: italic. No font-weight other than 400 or 500.

### 4.2 The three registers

The system carries hierarchy through **three registers** — display, structure, data — differentiated by size, tracking, and case rather than by weight.

| Register | Carries | Expressed through |
|---|---|---|
| **Display** | Headlines, park names, hero copy | Large size, negative tracking, sentence case |
| **Structure** | Labels, navigation, metadata, UI chrome | Small size, positive tracking, uppercase (mostly) |
| **Data** | Numbers, frequencies, counts | Weight 500, tight tracking, sentence case |

### 4.3 Complete scale

#### Display register

| Token | Size | Weight | Tracking | Line height | Colour | Use |
|---|---|---|---|---|---|---|
| `display-hero` | 48px | 500 | -0.02em | 1.1 | `#1A1A1A` | Title screen, beat openers |
| `display-l` | 32px | 500 | -0.02em | 1.15 | `#1A1A1A` | Section headlines |
| `display-m` | 22px | 500 | -0.01em | 1.25 | `#1A1A1A` | Park names in View B, lens names in Beat 04 |
| `display-s` | 18px | 500 | -0.01em | 1.3 | `#1A1A1A` | Mid-prominence titles |

#### Body register

| Token | Size | Weight | Tracking | Line height | Colour | Use |
|---|---|---|---|---|---|---|
| `body-l` | 18px | 400 | 0 | 1.6 | `#3A3A3A` | Beat 04 lens descriptions |
| `body` | 15px | 400 | 0 | 1.7 | `#3A3A3A` | Default scrolly-telling copy |
| `body-s` | 13px | 400 | 0 | 1.65 | `#3A3A3A` | Tooltip excerpts, secondary copy |

#### Structure register

| Token | Size | Weight | Tracking | Case | Colour | Use |
|---|---|---|---|---|---|---|
| `label` | 11px | 500 | 0.10em | UPPERCASE | `#6B6B6B` | "REVIEWED WORDS", "DOMINANT LENS" |
| `label-s` | 10px | 500 | 0.12em | UPPERCASE | `#6B6B6B` | Tiny system labels |
| `nav` | 13px | 500 | 0.02em | Sentence | `#3A3A3A` | "Back to map", "Compare all five" |
| `nav-link` | 13px | 400 | 0.02em | Sentence | `#3A3A3A` | Inline links |
| `category` | 11px | 500 | 0.04em | lowercase | `#3A3A3A` | Category pill text — kept lowercase to match dataset register |

#### Data register

| Token | Size | Weight | Tracking | Colour | Use |
|---|---|---|---|---|---|
| `data-l` | 32px | 500 | -0.02em | `#1A1A1A` | Hero numbers (used sparingly) |
| `data-m` | 22px | 500 | -0.01em | `#1A1A1A` | Stat blocks |
| `data-s` | 13px | 500 | 0 | `#3A3A3A` | Inline counts in tooltips |

### 4.4 Word network (special case)

Default colour `#1A1A1A` on `--color-bg`. Sized dynamically:

```javascript
const fontSize = 11 + 21 * (Math.log(frequency) / Math.log(maxFrequency));
```

- Min: 11px (rare words at frequency 1–2)
- Max: 32px (Ciani's *beautiful* at 292)

On hover/active: weight shifts from 400 to 500, colour shifts to category hex. Both cues together because either alone is too subtle on a projector.

### 4.5 What is forbidden in typography

- Italic for any body text. Italic only acceptable in titles of works *if* mentioned in copy (rare).
- Font weights other than 400 and 500.
- Font sizes below 10px.
- `rgba()` for text colour.
- Title Case. Sentence case for prose, UPPERCASE for structural labels, lowercase for category pills.
- Using weight as the primary differentiator between hierarchy levels (it's only used as a difference between body 400 and data 500).
- Mid-sentence bolding. Bold/weight 500 is for headings, labels, and data only.

---

## 5. Component primitives

These are the building blocks all components use. Lock them once; reuse everywhere.

### 5.1 Tag pill (category indicator)

```
[ ● emotional ]
```

- Container: 0.5px border `--color-border-medium`, `--radius-pill`, padding `4px 10px`, background `--color-bg`
- Dot: 7px circle, the lens hex, no border
- Text: `category` token (11 / 500 / 0.04em / lowercase / `#3A3A3A`)
- Gap between dot and text: 6px

### 5.2 Button — primary action

```
[ Compare all five ]
```

- Container: 0.5px border `--color-text-primary` (`#1A1A1A`), `--radius-md`, padding `9px 18px`, background `--color-bg`, hover background `--color-surface-secondary`
- Text: `nav` token (13 / 500 / 0.02em / sentence case / `#3A3A3A`)
- No background fill. Outline style. The interface holds itself together with hairlines.

### 5.3 Inline link

```
← Back to map
```

- Text: `nav-link` token (13 / 400 / 0.02em / `#3A3A3A`)
- Hover: colour shifts to `#1A1A1A`, no underline
- Always preceded by an arrow glyph (← → ↗ ↘) when contextually appropriate

### 5.4 Stat block

```
1,620 reviewed words
98 distinct words
```

- Number: `data-m` (22 / 500 / -0.01em / `#1A1A1A`)
- Unit/label inline: `body-s` (13 / 400 / `#3A3A3A`)
- Tight vertical stack, 4px between number and any subtitle line

### 5.5 Hairline divider

A `0.5px solid #E5E2DB` line. Used to separate sections within a card or panel. Margin `var(--space-5)` above and below by default. Never used decoratively — only where two distinct content zones meet.

### 5.6 Aura thumbnail

A breathing circular blob, 64px diameter at the standard size, composed of the six lens colours in proportions specific to each park. Implementation specifics are deferred to Phase 1's blob prototype, but for static design mockups:

- Smooth blended edges, no visible wedges or pie segments
- Renders correctly at 32px (View C station), 64px (View B header), and 180px (View C main)
- Non-clickable when shown as an anchor in View B header
- Clickable when shown as a primary element on the map (View A) or in View C

---

## 6. Layout principles

### 6.1 Width and breathing

- Maximum reading width for body copy: **640px**. Beyond this, readability breaks.
- Maximum width for full mockups (View B, View C): **1280px**.
- Minimum mobile width supported: **375px** (iPhone SE / standard mobile).
- Generous whitespace is doing structural work. When in doubt, add more space, not more content.

### 6.2 Card and panel pattern

Cards have:
- Background `--color-bg` (or `--color-surface-secondary` for nested)
- 0.5px border `--color-border-light`
- `--radius-lg` corners
- Padding `--space-6` (32px) on all sides
- No drop shadow

### 6.3 What is forbidden in layout

- Drop shadows, glows, blurs.
- Gradients (anywhere, including aura backgrounds — the aura blends colour through actual blending, not through CSS gradient).
- Decorative imagery, illustrations, icons beyond functional UI.
- Emoji.
- Pure white `#FFFFFF`. Use `--color-bg`.
- Pure black `#000000`. Use `--color-text-primary`.

---

## 7. Interaction patterns

### 7.1 Hover

- Word in network: colour shifts to category hex, weight shifts to 500, scale 1.05× over 200ms ease
- Tag pill: border colour darkens to `--color-border-medium`, no other change
- Button: background fills with `--color-surface-secondary`, no other change
- Link: colour shifts from `#3A3A3A` to `#1A1A1A`

All transitions: 200ms ease. Never longer.

### 7.2 Click / active

- Buttons compress slightly: `transform: scale(0.98)` for 100ms
- Pinned word in network: subtle ring around it (0.5px, category hex, offset 4px)

### 7.3 Focus

Keyboard focus rings: `outline: 2px solid var(--color-text-primary); outline-offset: 2px`. Non-negotiable for accessibility.

### 7.4 Animation timing

- Beat-to-beat scroll transitions in Act I: 400–600ms ease-out
- View A → View B park entry (first time): up to 1200ms with particle dissolve
- View B park-to-park cycling: 600ms crossfade with aura morph
- Modal open (View C): 250ms fade-in with map dim behind
- Aura "breathing" in all contexts: ~3% scale oscillation, ~4 seconds per cycle, ease-in-out

---

## 8. Three views of Act II

### 8.1 View A — Map of Lugano

- Five park aura blobs positioned geographically
- Blob size = review volume (square-root scaled, 5× ratio between Lambertenghi and Ciani)
- Top-right: "Compare all five" button
- Hover blob: small tooltip with park name, review count, dominant lens
- Click blob: → View B for that park

### 8.2 View B — Park word network

- Sticky header strip (~96–120px tall): back link, park name with cycle arrows, subtitle, aura thumbnail, compare button
- Main canvas: force-directed word network, words sized by frequency, clustered by category — no drawn boundaries
- Bottom strip: legend with six lens swatches and counts, clickable to filter
- Tooltip: fixed bottom-left position when a word is hovered or pinned

### 8.3 View C — Compare all five

- Modal overlay above View A (map dimmed and blurred behind)
- Five auras at equal size in a single row, ordered by review volume descending
- Above each aura: size-indicator microbar showing actual volume
- Below each aura: park name, top 3 words, dominant lens chip
- Bottom: three discussion-prompt questions

---

## 9. Decisions explicitly NOT in this document (yet)

These need resolution before later phases. Listed so they don't fall through the cracks.

1. **Map base style** — geographic accuracy or stylised abstraction? Recommendation: stylised. Lugano's literal geography isn't doing storytelling work.
2. **Blob rendering technique** — SVG with gradient meshes, Canvas with shader, CSS conic-gradient with blur? Resolved during Phase 1's blob prototype.
3. **Mobile design priority** — desktop/projector is the canonical surface. Mobile is acceptable to be slightly less rich. Detailed mobile spec deferred until desktop is locked.
4. **Worked-example animation timing** — frame-by-frame timing for Beat 05 deferred to Phase 4 implementation.
5. **Facilitator brief** — separate document, not part of the design system. To be drafted once core screens are designed.

---

## 10. Document history

- v1.0 — Initial system locked. Inter, two weights, warm off-white, six-lens palette as specified.

---

## 11. How to use this document

**Designers (Phase 2 in Claude design):** Reference token names and values directly in prompts. Do not invent new tokens. If a component needs something not in this document, raise it as a decision *before* designing.

**Developers (Phase 3 in Claude Code):** Implement section 2 as `tokens.css` first. Reference section 4 for typography classes. Reference section 5 for primitive components. Build from primitives up.

**Anyone proposing a change:** Open the change as an explicit conversation with the team. Note the section affected, the proposed change, and the reason. Update document history if accepted.
