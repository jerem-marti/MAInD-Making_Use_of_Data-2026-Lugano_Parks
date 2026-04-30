# Documentation — An Aura of Words

This folder contains the project documentation for **An Aura of Words: Green Spaces of Lugano** (SUPSI MAIND-S2 / Make Use of Data).

## What's here

| File / folder | What it is |
| --- | --- |
| [`documentation.md`](./documentation.md) | The full document — abstract, debate, dataset, methodology, visualisation, gallery, video, credits. Canonical source. |
| [`index.html`](./index.html) | Browser renderer: loads `documentation.md`, applies `print.css`, used to export the PDF. |
| [`print.css`](./print.css) | A4 print stylesheet — mirrors the project's design tokens (Inter, six-lens palette, hairline borders). |
| `assets/img/` | Screenshots of each beat (1920×1080 PNG). Capture using the shot-list below. |
| `assets/img/phase3/` | Earlier Phase 3 layout studies (copy from `screenshots/phase3/`). |
| `assets/video/walkthrough.mp4` | 90–120 s screen recording of the live demo. |

## Read it on GitHub

Open [`documentation.md`](./documentation.md) on GitHub — it renders natively. Inline HTML (figures, blockquote callouts, lens swatches) degrades gracefully.

## Export it to PDF (designer-quality)

1. **Serve the folder locally.** Browsers block `fetch()` on `file://`, so run a tiny static server. Any of these works:
   - `npx serve docs` (Node — no install needed beyond `npx`)
   - `python -m http.server 8000` from the `docs/` directory
   - VS Code "Live Server" extension on `docs/index.html`
2. **Open** `http://localhost:<port>/index.html` in **Chrome** (recommended) or another Chromium-based browser. Wait for the page to render.
3. **Print.** `Cmd/Ctrl + P` → set:
   - **Destination**: *Save as PDF*
   - **Paper size**: A4
   - **Margins**: Default
   - **Options → Background graphics**: ✅ ON (essential for the lens-coloured rule and swatches)
   - **Headers and footers**: off
4. **Save** as `An-Aura-of-Words-Documentation.pdf` (or similar).

Expected length: 8–14 pages (cover + nine sections + gallery + video poster + colophon).

## Capture the screenshots

Capture on the deployed site at <https://jerem-marti.github.io/MAInD-Making_Use_of_Data-2026-Lugano_Parks/> at default desktop viewport, 100% browser zoom, browser chrome cropped (e.g. via macOS `Cmd+Shift+4` then drag, or Chrome DevTools "Capture full size screenshot").

Store under `docs/assets/img/`:

| File | Moment |
| --- | --- |
| `01-opening.png` | Beat 01 hero with drifting review excerpts visible |
| `02-method.png` | Beat 02 mid-scroll, encoding pipeline at peak clarity |
| `04-lenses-overview.png` | Beat 04 with all six lenses visible side-by-side |
| `04-lens-emotional.png` | Beat 04 zoomed on one lens (Experiential–Emotional) |
| `05-annotation-mid.png` | Beat 05 mid-annotation: words being coloured, counter mid-build |
| `05-aura-final.png` | Beat 05 end: full aura formed |
| `06-map.png` | Beat 06 — all five park auras placed on the Lugano map |
| `06-park-detail.png` | Optional: clicked park detail view |

Also copy the five existing files from `../screenshots/phase3/` into `docs/assets/img/phase3/`:

```
01-ciani.png · 02-tassino.png · 03-san-michele.png · 04-paradiso.png · 05-lambertenghi.png
```

## Record the walkthrough video

Save to `docs/assets/video/walkthrough.mp4`.

- **Length**: 90–120 s
- **Resolution**: 1920×1080
- **Frame rate**: 30 fps minimum (60 fps preferred for smooth scroll)
- **Codec**: H.264 (libx264), AAC audio (silent acceptable)
- **Target size**: ≤40 MB
- **Tool**: OBS Studio (free, cross-platform). On macOS, QuickTime screen recording also works.

**Shot list:**

| Time | Beat | Action |
| --- | --- | --- |
| 0:00 – 0:08 | Beat 01 | Hero. Let one drifting excerpt complete a pass. |
| 0:08 – 0:23 | Beat 02 | Slow scroll into the method explanation; pause at peak. |
| 0:23 – 0:48 | Beat 04 | Reveal all six lenses; pause 2–3 s on each. |
| 0:48 – 1:13 | Beat 05 | Worked example: word-by-word annotation, counter completes, aura forms. |
| 1:13 – 1:28 | Beat 06 | Map reveals all five park auras. |
| 1:28 – 1:50 | (optional) | Click into one park detail, then back to map. |

Capture in an incognito window with the OS "Reduce motion" setting **off**, on the deployed site (so the base path resolves correctly).

## Compress the video (if it's over 40 MB)

```sh
ffmpeg -i raw.mov -vcodec libx264 -crf 23 -preset slow -acodec aac -b:a 96k walkthrough.mp4
```

Higher `-crf` = smaller file (try 26–28 if still too large). Typical 1080p / 90 s recording lands around 15–25 MB at CRF 23.
