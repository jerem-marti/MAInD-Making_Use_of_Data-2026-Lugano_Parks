import { loadParks, weightsArray } from "./data.js";
import { createBlob } from "./blob.js";

// New vibrant Phase-1 starting palette (per updated brief).
const PALETTE = {
  experiential_emotional:   "#C4A8FF", // lavender — Emotional
  sensory_environmental:    "#40FFB8", // mint    — Sensory
  action:                   "#52E8FF", // cyan    — Action
  relational_context:       "#FFE040", // yellow  — Relational
  infrastructure_amenities: "#FFB47A", // peach   — Infrastructure
  tension_complaint:        "#FF7060", // coral   — Tension
};

// ────────────────────────────────────────────────────────────────────────
// Boot
// ────────────────────────────────────────────────────────────────────────

const data = await loadParks();
const cats = data.categories;

const state = {
  size: 400,
  weights: weightsArray(data.parks[0].weights, cats),
  colours: cats.map((c) => PALETTE[c]),
  blend: 0.55,
  flow: 0.65,
  wobble: 0.30,
  edgeSoftness: 0.40,
  highlight: 0.70,
  saturation: 1.00,
  rate: 6,
  amplitude: 0,
  selectedPark: data.parks[0].name,
};

// Common params for hero + strip blobs (everything except size + weights).
function sharedParams() {
  return {
    colours: state.colours,
    blend: state.blend,
    flow: state.flow,
    wobble: state.wobble,
    edgeSoftness: state.edgeSoftness,
    highlight: state.highlight,
    saturation: state.saturation,
    rate: state.rate,
    amplitude: state.amplitude,
  };
}

// ── Hero ────────────────────────────────────────────────────────────────
const heroStage = document.getElementById("hero-stage");
const hero = createBlob({
  size: state.size,
  weights: state.weights,
  ...sharedParams(),
});
heroStage.appendChild(hero.element);
const heroMeta = document.getElementById("hero-meta");

// ── Strips ──────────────────────────────────────────────────────────────
const strip120 = document.getElementById("strip-120");
const strip200 = document.getElementById("strip-200");

const stripBlobs = [];
for (const park of data.parks) {
  const w = weightsArray(park.weights, cats);
  const item120 = makeStripItem(park, 120, w);
  const item200 = makeStripItem(park, 200, w);
  strip120.appendChild(item120.wrap);
  strip200.appendChild(item200.wrap);
  stripBlobs.push({ park, blob120: item120.blob, blob200: item200.blob });
}

function makeStripItem(park, size, weights) {
  const wrap = document.createElement("div");
  wrap.className = "item";
  const blob = createBlob({ size, weights, ...sharedParams() });
  wrap.appendChild(blob.element);
  const label = document.createElement("div");
  label.className = "label";
  label.innerHTML = `<strong>${park.short_name}</strong>${park.unique_terms} terms`;
  wrap.appendChild(label);
  return { wrap, blob };
}

// ── Park preset ─────────────────────────────────────────────────────────
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
  hero.update({ weights: state.weights });
  refreshMeta();
});

// ── Background colour ──────────────────────────────────────────────────
const bg = document.getElementById("bg-color");
bg.addEventListener("input", () => {
  document.body.style.backgroundColor = bg.value;
});

// ── Weight controls ────────────────────────────────────────────────────
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
    hero.update({ weights: state.weights });
    refreshMeta();
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
  hero.update({ weights: state.weights });
  refreshMeta();
});

function syncWeightInputs() {
  state.weights.forEach((w, i) => { weightInputs[i].value = w.toFixed(2); });
}

// ── Colour controls ────────────────────────────────────────────────────
const colourControls = document.getElementById("colour-controls");
const colourInputs = [];
const swatchStrip = document.getElementById("swatch-strip");

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
    refreshAllBlobs();
    refreshSwatches();
  });
  row.appendChild(lbl);
  row.appendChild(inp);
  colourControls.appendChild(row);
  colourInputs.push(inp);

  const swatch = document.createElement("div");
  swatchStrip.appendChild(swatch);
});

function refreshSwatches() {
  Array.from(swatchStrip.children).forEach((el, i) => {
    el.style.background = state.colours[i];
  });
}
refreshSwatches();

// ── Range sliders ──────────────────────────────────────────────────────
const sliders = [
  ["size",       "size-val",  (v) => `${v}px`,              (v) => +v,         "size"],
  ["softness",   "soft-val",  (v) => `${v}%`,               (v) => +v / 100,   "edgeSoftness"],
  ["blend",      "blend-val", (v) => `${v}%`,               (v) => +v / 100,   "blend"],
  ["flow",       "flow-val",  (v) => `${v}%`,               (v) => +v / 100,   "flow"],
  ["wobble",     "wob-val",   (v) => `${v}%`,               (v) => +v / 100,   "wobble"],
  ["highlight",  "hl-val",    (v) => `${v}%`,               (v) => +v / 100,   "highlight"],
  ["saturation", "sat-val",   (v) => `${v}%`,               (v) => +v / 100,   "saturation"],
  ["rate",       "rate-val",  (v) => `${(+v).toFixed(1)}s`,  (v) => +v,         "rate"],
  ["amplitude",  "amp-val",   (v) => `${(+v).toFixed(1)}%`,  (v) => +v,         "amplitude"],
];
for (const [id, valId, fmt, parse, stateKey] of sliders) {
  const el = document.getElementById(id);
  const valEl = document.getElementById(valId);
  // Display current state (the slider's HTML value is the on-load default).
  valEl.textContent = fmt(el.value);
  el.addEventListener("input", () => {
    state[stateKey] = parse(el.value);
    valEl.textContent = fmt(el.value);
    if (stateKey === "size") {
      hero.update({ size: state.size });
    } else {
      refreshAllBlobs();
    }
  });
}

// ── Refresh ────────────────────────────────────────────────────────────
function refreshAllBlobs() {
  hero.update({ ...sharedParams(), weights: state.weights });
  for (const { blob120, blob200 } of stripBlobs) {
    blob120.update(sharedParams());
    blob200.update(sharedParams());
  }
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
