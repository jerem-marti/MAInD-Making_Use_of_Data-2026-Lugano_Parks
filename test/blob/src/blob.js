// Candidate A: SVG + positioned radial gradients + feTurbulence/feDisplacementMap.
//
// Public API (DOM-only, no globals):
//   const blob = createBlob({ size, weights, colours, ...params });
//   container.appendChild(blob.element);
//   blob.update({ weights, colours, ... });   // partial OK
//   blob.destroy();
//
// Phase-4-reusable: hand it (weights, colours, size) and it renders. No
// coupling to the parameter-panel UI or the data loader.
//
// Approach: each category is a soft-edged disk (radial gradient with alpha
// falloff) positioned around a circle by category index. Weight controls
// each disk's *size* and how close its centre sits to the blob centre.
// Disks blend at their soft edges via straight alpha compositing — that's
// what produces the "colours bleed into each other" quality without the
// washing-toward-white that screen-mode causes.

let nextId = 0;

const DEFAULTS = {
  size: 400,
  weights: [1, 0, 0, 0, 0, 0],
  colours: ["#D97757", "#5FA88A", "#E8A33D", "#E89A8E", "#5A7A8E", "#8E7CA3"],
  softness: 22,        // 0..100  outer-edge alpha falloff (kept gentle)
  blend: 65,           // 0..100  controls disk overlap (bleed strength)
  irregularity: 18,    // 0..100  silhouette deformation
  rate: 6,             // s/cycle breathing period
  amplitude: 3,        // %       breathing scale oscillation
};

const SVG_NS = "http://www.w3.org/2000/svg";

/** Visual-area floor so a 1% category remains perceptible at small sizes. */
function visualWeight(w, floor = 0.18) {
  const eased = Math.sqrt(Math.max(0, Math.min(1, w)));
  return floor + (1 - floor) * eased;
}

/** Parse #rrggbb (or named) into [r,g,b] 0..255. */
function hexToRgb(hex) {
  const s = hex.replace('#', '');
  if (s.length === 3) {
    return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)];
  }
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  const c = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Weighted RGB mix of palette colours, used as a base ground tone. */
function weightedMix(colours, weights) {
  let r = 0, g = 0, b = 0, total = 0;
  colours.forEach((hex, i) => {
    const w = weights[i] ?? 0;
    if (w <= 0) return;
    const [cr, cg, cb] = hexToRgb(hex);
    r += cr * w; g += cg * w; b += cb * w; total += w;
  });
  if (total === 0) return '#cccccc';
  return rgbToHex(r / total, g / total, b / total);
}

export function createBlob(opts = {}) {
  const id = `blob-${nextId++}`;
  const state = { ...DEFAULTS, ...opts };

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.classList.add("blob-svg");

  const defs = document.createElementNS(SVG_NS, "defs");

  // ── Turbulence-driven silhouette displacement ──────────────────────────
  const turbFilter = document.createElementNS(SVG_NS, "filter");
  turbFilter.setAttribute("id", `${id}-turb`);
  turbFilter.setAttribute("x", "-25%"); turbFilter.setAttribute("y", "-25%");
  turbFilter.setAttribute("width", "150%"); turbFilter.setAttribute("height", "150%");
  turbFilter.setAttribute("color-interpolation-filters", "sRGB");
  const fe = document.createElementNS(SVG_NS, "feTurbulence");
  fe.setAttribute("type", "fractalNoise");
  fe.setAttribute("baseFrequency", "0.012");
  fe.setAttribute("numOctaves", "2");
  fe.setAttribute("seed", String(Math.floor(Math.random() * 99)));
  fe.setAttribute("result", "noise");
  turbFilter.appendChild(fe);
  const disp = document.createElementNS(SVG_NS, "feDisplacementMap");
  disp.setAttribute("in", "SourceGraphic");
  disp.setAttribute("in2", "noise");
  disp.setAttribute("scale", "8");
  disp.setAttribute("xChannelSelector", "R");
  disp.setAttribute("yChannelSelector", "G");
  turbFilter.appendChild(disp);
  defs.appendChild(turbFilter);

  // ── Per-category radial gradients (alpha falloff to transparent) ───────
  const gradientEls = [];
  for (let i = 0; i < 6; i++) {
    const g = document.createElementNS(SVG_NS, "radialGradient");
    g.setAttribute("id", `${id}-g${i}`);
    const s0 = document.createElementNS(SVG_NS, "stop"); s0.setAttribute("offset", "0%");
    const s1 = document.createElementNS(SVG_NS, "stop"); s1.setAttribute("offset", "60%");
    const s2 = document.createElementNS(SVG_NS, "stop"); s2.setAttribute("offset", "100%");
    g.appendChild(s0); g.appendChild(s1); g.appendChild(s2);
    defs.appendChild(g);
    gradientEls.push({ g, s0, s1, s2 });
  }

  // ── Edge softness blur (separate, applied to silhouette only) ──────────
  const blurFilter = document.createElementNS(SVG_NS, "filter");
  blurFilter.setAttribute("id", `${id}-blur`);
  blurFilter.setAttribute("x", "-15%"); blurFilter.setAttribute("y", "-15%");
  blurFilter.setAttribute("width", "130%"); blurFilter.setAttribute("height", "130%");
  const blur = document.createElementNS(SVG_NS, "feGaussianBlur");
  blur.setAttribute("in", "SourceGraphic");
  blur.setAttribute("stdDeviation", "0.6");
  blurFilter.appendChild(blur);
  defs.appendChild(blurFilter);

  // ── ClipPath: a circle that bounds the wobbly composite ────────────────
  const clip = document.createElementNS(SVG_NS, "clipPath");
  clip.setAttribute("id", `${id}-clip`);
  const clipCircle = document.createElementNS(SVG_NS, "circle");
  clipCircle.setAttribute("cx", "50");
  clipCircle.setAttribute("cy", "50");
  clipCircle.setAttribute("r", "47");
  clip.appendChild(clipCircle);
  defs.appendChild(clip);

  svg.appendChild(defs);

  // ── The renderable group ───────────────────────────────────────────────
  // Outer <g>: breathing transform.
  // Inner <g>: turbulence displacement on the silhouette.
  // Innermost <g>: clipped to the inner circle, contains the gradient discs.
  const breath = document.createElementNS(SVG_NS, "g");
  breath.classList.add("blob-breath");

  const wobble = document.createElementNS(SVG_NS, "g");
  wobble.setAttribute("filter", `url(#${id}-turb)`);

  const clipped = document.createElementNS(SVG_NS, "g");
  clipped.setAttribute("clip-path", `url(#${id}-clip)`);

  // Base fill: a circle that covers the clip, painted in the weight-mix
  // colour. This gives the blob a unified ground tone so it doesn't show
  // concave gaps where minor categories' disks don't reach the perimeter.
  const baseCircle = document.createElementNS(SVG_NS, "circle");
  baseCircle.setAttribute("cx", "50");
  baseCircle.setAttribute("cy", "50");
  baseCircle.setAttribute("r", "47");
  clipped.appendChild(baseCircle);

  // 6 gradient-filled circles, sized/positioned per category.
  // They are drawn in weight-ascending order (heaviest on top, most visible).
  const layerCircles = [];
  for (let i = 0; i < 6; i++) {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("fill", `url(#${id}-g${i})`);
    clipped.appendChild(c);
    layerCircles.push(c);
  }

  wobble.appendChild(clipped);
  breath.appendChild(wobble);
  svg.appendChild(breath);

  const root = document.createElement("div");
  root.className = "blob-root";
  root.appendChild(svg);

  // ── Update logic ───────────────────────────────────────────────────────
  function applySize() {
    root.style.width = `${state.size}px`;
    root.style.height = `${state.size}px`;
  }

  function applyParams() {
    // Soft outer edge: scale gaussian stdDev with softness slider, but keep
    // it small so the interior stays crisp. 100% maps to ~0.9 viewBox units.
    const baseSoft = state.softness / 100;        // 0..1
    blur.setAttribute("stdDeviation", (baseSoft * 0.9 + 0.05).toFixed(2));
    svg.style.filter = baseSoft > 0 ? `url(#${id}-blur)` : "none";

    // Irregularity: feDisplacementMap scale (0..18 viewBox units).
    disp.setAttribute("scale", String((state.irregularity / 100) * 18));

    // Internal blending t controls how much the discs spread/overlap.
    const blendT = state.blend / 100;            // 0..1

    // Normalise weights.
    const wsum = state.weights.reduce((a, b) => a + b, 0) || 1;
    const norm = state.weights.map((w) => w / wsum);

    // Base ground tone: weighted-mix colour, low alpha. Disks paint over.
    const baseColour = weightedMix(state.colours, norm);
    baseCircle.setAttribute("fill", baseColour);
    baseCircle.setAttribute("fill-opacity", "0.55");

    // Place each category at a fixed angular slot around a constant-radius
    // ring. The disk *size* (and inner alpha) carries the weight encoding —
    // heavier categories get larger, more saturated zones; minor categories
    // remain visible but small. This gives each park a distinct
    // constellation of zones rather than collapsing all heavy categories to
    // the centre (which made every park look the same).
    // Each category sits in an angular slot near the perimeter, occupying
    // ~one wedge of the circle. Disk size scales with weight (so dominant
    // categories get larger zones), but eccentricity is roughly constant
    // so disks form a ring around the centre rather than collapsing onto
    // it. Zones overlap at their soft alpha edges, producing the "colours
    // bleed into each other" quality without one category covering the
    // whole blob.
    const placements = norm.map((w, i) => {
      const vw = visualWeight(w);                       // weight w/ floor
      const theta = (i / 6) * Math.PI * 2 - Math.PI / 2;
      // Eccentricity: sit ~half-way out from centre. Slightly less for
      // heavy weights so they push their colour inward more.
      const ecc = 0.42 - 0.08 * Math.sqrt(w);
      const cx = 50 + ecc * 47 * Math.cos(theta);
      const cy = 50 + ecc * 47 * Math.sin(theta);
      // Disk radius: floor + linear scale with weight.
      //   1%   → ~22 viewBox units (small zone at the rim)
      //   46%  → ~38 viewBox units (clear dominant zone)
      // Adjacent disks (60° apart, ecc≈0.4) sit ~24 units apart, so disks
      // of radius 22 already meet at their edges — perfect for soft bleed.
      const radius = (20 + w * 38) * (0.95 + 0.12 * blendT);
      // Inner alpha grows with weight; visualWeight floor keeps tiny
      // categories perceptible (so Tension at 1% remains findable).
      const innerAlpha = 0.55 + 0.35 * w + 0.10 * vw;
      return { theta, cx, cy, radius, innerAlpha, w, vw };
    });

    // Draw order: ascending weight (heaviest last → on top).
    const order = placements
      .map((p, i) => ({ p, i }))
      .sort((a, b) => a.p.w - b.p.w);

    order.forEach(({ p, i }) => {
      const grad = gradientEls[i];
      grad.g.setAttribute("cx", "50%");
      grad.g.setAttribute("cy", "50%");
      grad.g.setAttribute("r", "50%");
      grad.g.setAttribute("fx", "50%");
      grad.g.setAttribute("fy", "50%");

      const colour = state.colours[i];
      grad.s0.setAttribute("stop-color", colour);
      grad.s0.setAttribute("stop-opacity", p.innerAlpha.toFixed(3));
      grad.s1.setAttribute("stop-color", colour);
      grad.s1.setAttribute("stop-opacity", (p.innerAlpha * 0.6).toFixed(3));
      grad.s1.setAttribute("offset", `${(55 + 20 * blendT).toFixed(0)}%`);
      grad.s2.setAttribute("stop-color", colour);
      grad.s2.setAttribute("stop-opacity", "0");

      const c = layerCircles[i];
      c.setAttribute("cx", p.cx.toFixed(2));
      c.setAttribute("cy", p.cy.toFixed(2));
      c.setAttribute("r", p.radius.toFixed(2));
      // DOM order = paint order; ascending weight means heaviest ends up last.
      clipped.appendChild(c);
    });

    // Breathing animation
    if (state.amplitude > 0 && state.rate > 0) {
      breath.style.animation = `blob-breath ${state.rate}s ease-in-out infinite`;
      root.style.setProperty("--blob-amp", `${1 + state.amplitude / 100}`);
    } else {
      breath.style.animation = "none";
    }
  }

  applySize();
  applyParams();

  return {
    element: root,
    svg,
    update(patch) {
      Object.assign(state, patch);
      if ("size" in patch) applySize();
      applyParams();
    },
    getState() { return { ...state }; },
    destroy() { root.remove(); },
  };
}
