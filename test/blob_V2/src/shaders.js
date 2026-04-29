// GLSL shader pair for the blob.
//
// Reference: a near-perfectly-circular silhouette, INTERNAL colour flow
// (anchors drift slowly), a thin glassy rim, and a soft coloured halo.
//
// Strategy:
//   - Silhouette is *almost* a circle, with a very subtle low-frequency
//     wobble driven by uWobble. The wobble is gentle enough that the
//     outline still reads as round.
//   - For each pixel, mix the 6 colours via Gaussian-weighted influence.
//     Anchor positions are animated by JS so colour zones flow inside
//     the silhouette.
//   - Rim brightening adds a glassy edge ring. Outer halo lives in CSS.

export const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

export const FRAG = /* glsl */ `
  precision highp float;

  #define N 6

  uniform vec3  uColours[N];
  uniform vec2  uPositions[N];
  uniform float uWeights[N];
  uniform float uTime;
  uniform float uBlend;        // 0..1   sigma scale (bleed strength)
  uniform float uEdgeSoftness; // 0..1   outer-edge alpha falloff width
  uniform float uBreath;       // ~1.0   current breathing scale
  uniform float uHighlight;    // 0..1   off-centre interior highlight
  uniform float uSaturation;   // 0..1+  global saturation multiplier
  uniform float uWobble;       // 0..1   subtle silhouette deformation amount

  varying vec2 vUv;

  // Hash & smooth value-noise (cheap fbm).
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  vec3 saturate3(vec3 c, float s) {
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(l), c, s);
  }

  void main() {
    vec2 pos = (vUv - 0.5) * 2.0 / uBreath;
    float r   = length(pos);
    float ang = atan(pos.y, pos.x);

    // Subtle silhouette deformation: very low spatial frequency along the
    // angle, drifting slowly with time. Max amplitude is small (≤4% radius
    // at uWobble=1.0) so the outline still reads as a smooth circle.
    float wobbleNoise = noise(vec2(cos(ang) * 1.4, sin(ang) * 1.4) + uTime * 0.06);
    float deform = (wobbleNoise - 0.5) * uWobble * 0.045;
    float silhouette = 0.96 + deform;

    // Soft alpha falloff at the perimeter.
    float band = max(0.015, uEdgeSoftness * 0.18);
    float alpha = smoothstep(silhouette + 0.01, silhouette - band, r);
    if (alpha <= 0.0) discard;

    // ── Weighted Gaussian colour mix ───────────────────────────────────
    vec3  col = vec3(0.0);
    float totalInf = 0.0;
    for (int i = 0; i < N; i++) {
      float d = distance(pos, uPositions[i]);
      float sigma = 0.16 + uWeights[i] * (0.30 + 0.50 * uBlend);
      float inf   = exp(-d * d / (2.0 * sigma * sigma)) * uWeights[i];
      col      += uColours[i] * inf;
      totalInf += inf;
    }
    col /= max(totalInf, 1e-4);

    // Off-centre interior highlight (quasi-3D glow). Stays well inside
    // the blob — never reaches the perimeter, so it can't create a rim.
    vec2 hl = vec2(-0.30, -0.42);
    float hd = distance(pos, hl);
    float highlight = smoothstep(0.85, 0.0, hd) * uHighlight * 0.18;
    col += vec3(highlight);

    col = saturate3(col, uSaturation);

    gl_FragColor = vec4(col, alpha);
  }
`;
