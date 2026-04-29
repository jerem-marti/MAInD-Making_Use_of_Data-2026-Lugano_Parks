// Three.js / GLSL implementation of the blob.
//
// Phase-4-reusable API:
//   import { createBlob } from './blob.js';
//   const blob = createBlob({ size: 400, weights, colours });
//   container.appendChild(blob.element);
//   blob.update({ weights });          // partial updates supported
//   blob.destroy();                    // cleans up GL context + RAF
//
// Animation model (matches the reference video):
//   - Silhouette is a static perfect circle.
//   - Internal colour anchors drift slowly via per-anchor sin/cos
//     oscillators driven by uTime, producing the "colours flowing inside
//     a glass sphere" feel without deforming the outline.

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VERT, FRAG } from "./shaders.js";

const DEFAULTS = {
  size: 280,
  weights: [1, 0, 0, 0, 0, 0],
  // Vibrant Phase-1 starting palette.
  colours: ["#C4A8FF", "#40FFB8", "#52E8FF", "#FFE040", "#FFB47A", "#FF7060"],
  // Base anchor positions (blob-space, -1..1). Six angular slots.
  basePositions: defaultPositions(),
  blend: 0.55,         // 0..1   sigma scale (bleed strength)
  opacity: 1.00,       // 0..1   whole-blob opacity
  edgeSoftness: 0.40,  // 0..1   outer alpha falloff width
  saturation: 1.00,    // 0..1+  saturation multiplier
  background: "#E8EFFA",
  flow: 1.30,          // 0..1   anchor drift amount (2x increased)
  wobble: 0.30,        // 0..1   subtle silhouette deformation
  rate: 6,             // s/cycle  breathing period
  amplitude: 4,        // %        breathing scale oscillation
  paused: false,
};

function defaultPositions() {
  const ECC = 0.42;
  const out = [];
  for (let i = 0; i < 6; i++) {
    const theta = (i / 6) * Math.PI * 2 - Math.PI / 2;
    out.push([ECC * Math.cos(theta), ECC * Math.sin(theta)]);
  }
  return out;
}

function hexToVec3(hex) {
  const s = hex.replace('#', '');
  const v = (s.length === 3)
    ? [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)]
    : [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  return new THREE.Vector3(v[0] / 255, v[1] / 255, v[2] / 255);
}

// Per-anchor drift signature. Each anchor jitters in a *small* Lissajous
// ellipse around its base position — small enough that the time-averaged
// dominant-colour map of the blob doesn't change. The motion adds
// life/texture, not a different data signature.
function makeDriftPhases() {
  const phases = [];
  for (let i = 0; i < 6; i++) {
    phases.push({
      ax: 0.05 + Math.random() * 0.04,    // x oscillator frequency
      ay: 0.045 + Math.random() * 0.04,   // y oscillator frequency
      px: Math.random() * Math.PI * 2,    // x phase
      py: Math.random() * Math.PI * 2,    // y phase
      // Small amplitudes: ~10% of inter-anchor spacing (anchors sit ~0.42
      // apart on the ring). Anchors stay inside their own neighbourhood
      // so zones don't visually swap places.
      rx: 0.025 + Math.random() * 0.02,   // x amplitude (blob-space units)
      ry: 0.025 + Math.random() * 0.02,   // y amplitude
    });
  }
  return phases;
}

export function createBlob(opts = {}) {
  const state = { ...DEFAULTS, ...opts };
  state.weights = state.weights.slice();
  state.colours = state.colours.slice();
  state.basePositions = (opts.positions ?? state.basePositions).map((p) => p.slice());

  const drift = makeDriftPhases();
  const wobbleSeed = Math.random();

  // ── DOM scaffolding ─────────────────────────────────────────────────
  const root = document.createElement("div");
  root.className = "blob-root";

  const canvas = document.createElement("canvas");
  canvas.className = "blob-canvas";
  root.appendChild(canvas);

  // ── Three.js plumbing ──────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  const uColours   = new Array(6).fill(0).map(() => new THREE.Vector3());
  const uPositions = new Array(6).fill(0).map(() => new THREE.Vector2());
  const uWeights   = new Float32Array(6);

  const uniforms = {
    uColours:      { value: uColours },
    uPositions:    { value: uPositions },
    uWeights:      { value: uWeights },
    uTime:         { value: 0 },
    uBlend:        { value: state.blend },
    uOpacity:      { value: state.opacity },
    uEdgeSoftness: { value: state.edgeSoftness },
    uBreath:       { value: 1.0 },
    uSaturation:   { value: state.saturation },
    uWobble:       { value: state.wobble },
    uWobbleSeed:   { value: wobbleSeed },
    uBackground:   { value: hexToVec3(state.background) },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  material.blending = THREE.NormalBlending;

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // ── Update logic ───────────────────────────────────────────────────
  function applySize() {
    const { size } = state;
    renderer.setSize(size, size, false);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
  }

  function applyParams() {
    const wsum = state.weights.reduce((a, b) => a + b, 0) || 1;
    for (let i = 0; i < 6; i++) uWeights[i] = (state.weights[i] || 0) / wsum;

    for (let i = 0; i < 6; i++) {
      const v = hexToVec3(state.colours[i] || "#888888");
      uColours[i].copy(v);
    }

    uniforms.uBlend.value        = state.blend;
    uniforms.uOpacity.value      = state.opacity;
    uniforms.uEdgeSoftness.value = state.edgeSoftness;
    uniforms.uSaturation.value   = state.saturation;
    uniforms.uWobble.value       = state.wobble;
    uniforms.uBackground.value.copy(hexToVec3(state.background));
  }

  // ── Render loop ────────────────────────────────────────────────────
  let raf = 0;
  let startTs = performance.now();

  function tick(now) {
    const t = (now - startTs) / 1000;
    uniforms.uTime.value = t;

    // Animate anchor positions: each anchor wanders in a small ellipse
    // around its base. `flow` scales the wander amplitude.
    const f = state.flow;
    for (let i = 0; i < 6; i++) {
      const [bx, by] = state.basePositions[i];
      const d = drift[i];
      const dx = Math.sin(t * d.ax * Math.PI * 2 + d.px) * d.rx * f;
      const dy = Math.cos(t * d.ay * Math.PI * 2 + d.py) * d.ry * f;
      uPositions[i].set(bx + dx, by + dy);
    }

    let breath = 1.0;
    if (state.amplitude > 0 && state.rate > 0) {
      breath = 1.0 + (state.amplitude / 100) * Math.sin((t / state.rate) * Math.PI * 2);
    }
    uniforms.uBreath.value = breath;

    renderer.render(scene, camera);
    raf = state.paused ? 0 : requestAnimationFrame(tick);
  }

  applySize();
  applyParams();
  raf = requestAnimationFrame(tick);

  return {
    element: root,
    canvas,
    update(patch) {
      if (!patch) return;
      if (patch.weights)       state.weights = patch.weights.slice();
      if (patch.colours)       state.colours = patch.colours.slice();
      if (patch.basePositions) state.basePositions = patch.basePositions.map((p) => p.slice());
      if (patch.positions)     state.basePositions = patch.positions.map((p) => p.slice());
      for (const k of [
        "size", "blend", "opacity", "edgeSoftness", "saturation", "background",
        "flow", "wobble", "rate", "amplitude", "paused",
      ]) if (k in patch) state[k] = patch[k];
      if ("size" in patch) applySize();
      applyParams();
      if (state.paused && raf) { cancelAnimationFrame(raf); raf = 0; }
      else if (!state.paused && !raf) raf = requestAnimationFrame(tick);
    },
    getState() { return JSON.parse(JSON.stringify(state)); },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      root.remove();
    },
  };
}
