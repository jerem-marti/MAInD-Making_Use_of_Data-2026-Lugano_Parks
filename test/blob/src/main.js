import { loadParks, weightsArray } from "./data.js";
import { createBlob } from "./blob.js";

// Starting palette (per Phase 1 brief). These are *starting positions* — the
// final hex values get locked by iterating in this prototype.
const PALETTE = {
  experiential_emotional:  "#D97757", // warm amber / terracotta
  sensory_environmental:   "#5FA88A", // green / sky-range
  action:                  "#E8A33D", // citrus yellow / warm orange
  relational_context:      "#E89A8E", // coral / peach
  infrastructure_amenities:"#5A7A8E", // slate blue / stone grey
  tension_complaint:       "#8E7CA3", // dusty purple — NOT red
};

// ────────────────────────────────────────────────────────────────────────
// Boot
// ────────────────────────────────────────────────────────────────────────

const data = await loadParks();
const cats = data.categories;

// State drives both the hero blob and the strips. The strips ignore weights
// (they show real-park weights instead) but inherit colours + form params.
const state = {
  size: 400,
  weights: weightsArray(data.parks[0].weights, cats), // start on first park (Ciani)
  colours: cats.map((c) => PALETTE[c]),
  softness: 22,
  blend: 65,
  irregularity: 18,
  rate: 6,
  amplitude: 3,
  selectedPark: data.parks[0].name,
};

// ── Hero blob ───────────────────────────────────────────────────────────
const heroStage = document.getElementById("hero-stage");
const hero = createBlob({
  size: state.size,
  weights: state.weights,
  colours: state.colours,
  softness: state.softness,
  blend: state.blend,
  irregularity: state.irregularity,
  rate: state.rate,
  amplitude: state.amplitude,
});
heroStage.appendChild(hero.element);

const heroMeta = document.getElementById("hero-meta");

// ── Strips: 5 parks at 120px and 200px ──────────────────────────────────
const strip120 = document.getElementById("strip-120");
const strip200 = document.getElementById("strip-200");

const stripBlobs = []; // [{ park, blob120, blob200 }]
for (const park of data.parks) {
  const w = weightsArray(park.weights, cats);

  const item120 = makeStripItem(park, 120, w);
  const item200 = makeStripItem(park, 200, w);
  strip120.appendChild(item120.wrap);
  strip200.appendChild(item200.wrap);
  stripBlobs.push({ park, blob120: item120.blob, blob200: item200.blob });
}

function makeStripItem(park, size, w) {
  const wrap = document.createElement("div");
  wrap.className = "item";
  const blob = createBlob({
    size,
    weights: w,
    colours: state.colours,
    softness: state.softness,
    blend: state.blend,
    irregularity: state.irregularity,
    rate: state.rate,
    amplitude: state.amplitude,
  });
  wrap.appendChild(blob.element);
  const label = document.createElement("div");
  label.className = "label";
  label.innerHTML = `<strong>${park.short_name}</strong>${park.review_count_proxy} terms`;
  wrap.appendChild(label);
  return { wrap, blob };
}

// ── Parameter panel ─────────────────────────────────────────────────────
const panel = document.getElementById("panel");

// Park preset
const select = document.getElementById("park-preset");
for (const p of data.parks) {
  const opt = document.createElement("option");
  opt.value = p.name;
  opt.textContent = p.short_name;
  select.appendChild(opt);
}
select.addEventListener("change", () => {
  const park = data.parks.find((p) => p.name === select.value);
  if (!park) return;
  state.selectedPark = park.name;
  state.weights = weightsArray(park.weights, cats);
  syncWeightInputs();
  refreshHero();
  refreshMeta();
});

// Background colour
const bg = document.getElementById("bg-color");
bg.addEventListener("input", () => {
  document.body.style.backgroundColor = bg.value;
  document.documentElement.style.setProperty("--bg", bg.value);
});

// Weight controls
const weightControls = document.getElementById("weight-controls");
const weightInputs = [];
cats.forEach((c, i) => {
  const row = document.createElement("div");
  row.className = "row";
  const lbl = document.createElement("span");
  lbl.className = "row-label";
  lbl.textContent = data.labels[c];
  const num = document.createElement("input");
  num.type = "number";
  num.min = "0"; num.max = "1"; num.step = "0.01";
  num.value = state.weights[i].toFixed(2);
  num.addEventListener("input", () => {
    state.weights[i] = parseFloat(num.value) || 0;
    refreshHero();
  });
  row.appendChild(lbl);
  row.appendChild(num);
  weightControls.appendChild(row);
  weightInputs.push(num);
});

document.getElementById("normalise-btn").addEventListener("click", () => {
  const sum = state.weights.reduce((a, b) => a + b, 0) || 1;
  state.weights = state.weights.map((w) => w / sum);
  syncWeightInputs();
  refreshHero();
});

function syncWeightInputs() {
  state.weights.forEach((w, i) => { weightInputs[i].value = w.toFixed(2); });
}

// Colour controls
const colourControls = document.getElementById("colour-controls");
const colourInputs = [];
cats.forEach((c, i) => {
  const row = document.createElement("div");
  row.className = "row";
  const lbl = document.createElement("span");
  lbl.className = "row-label";
  lbl.textContent = data.labels[c];
  const inp = document.createElement("input");
  inp.type = "color";
  inp.value = state.colours[i];
  inp.addEventListener("input", () => {
    state.colours[i] = inp.value;
    refreshAll();
  });
  row.appendChild(lbl);
  row.appendChild(inp);
  colourControls.appendChild(row);
  colourInputs.push(inp);
});

// Range sliders
const sliders = [
  ["size",         "size-val",    (v) => `${v}px`,    (v) => +v],
  ["softness",     "soft-val",    (v) => `${v}%`,     (v) => +v],
  ["blend",        "blend-val",   (v) => `${v}%`,     (v) => +v],
  ["irregularity", "irr-val",     (v) => `${v}%`,     (v) => +v],
  ["rate",         "rate-val",    (v) => `${(+v).toFixed(1)}s`, (v) => +v],
  ["amplitude",    "amp-val",     (v) => `${(+v).toFixed(1)}%`, (v) => +v],
];
for (const [id, valId, fmt, parse] of sliders) {
  const el = document.getElementById(id);
  const valEl = document.getElementById(valId);
  el.value = state[id];
  valEl.textContent = fmt(el.value);
  el.addEventListener("input", () => {
    state[id] = parse(el.value);
    valEl.textContent = fmt(el.value);
    if (id === "size") {
      hero.update({ size: state.size });
    } else {
      // Form/breathing changes apply to hero AND strips so the strips reflect
      // the same look the user is exploring on the hero.
      refreshAll();
    }
  });
}

// ── Refresh helpers ─────────────────────────────────────────────────────
function refreshHero() {
  hero.update({
    weights: state.weights,
    colours: state.colours,
    softness: state.softness,
    blend: state.blend,
    irregularity: state.irregularity,
    rate: state.rate,
    amplitude: state.amplitude,
  });
  refreshMeta();
}

function refreshStrips() {
  for (const { blob120, blob200 } of stripBlobs) {
    const params = {
      colours: state.colours,
      softness: state.softness,
      blend: state.blend,
      irregularity: state.irregularity,
      rate: state.rate,
      amplitude: state.amplitude,
    };
    blob120.update(params);
    blob200.update(params);
  }
}

function refreshAll() {
  refreshHero();
  refreshStrips();
}

function refreshMeta() {
  const park = data.parks.find((p) => p.name === state.selectedPark);
  const lines = [];
  if (park) lines.push(`<strong>${park.short_name}</strong> · ${park.unique_terms} unique terms`);
  lines.push(state.weights.map((w, i) => `${data.labels[cats[i]]}: ${(w * 100).toFixed(0)}%`).join("  ·  "));
  heroMeta.innerHTML = lines.join("<br>");

  const readout = document.getElementById("weights-readout");
  if (readout) {
    const sum = state.weights.reduce((a, b) => a + b, 0);
    readout.textContent =
      cats.map((c, i) => `${data.labels[c].padEnd(14)} ${state.weights[i].toFixed(3)}`).join("\n") +
      `\nSUM           ${sum.toFixed(3)}`;
  }
}

refreshMeta();
