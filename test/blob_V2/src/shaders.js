// GLSL shader pair for the blob.
//
// Reference: a near-perfectly-circular silhouette, internal colour flow
// (anchors drift slowly), and a subtle pulsating scale.
//
// Strategy:
//   - Silhouette is *almost* a circle, with a very subtle low-frequency
//     wobble driven by uWobble. The wobble is gentle enough that the
//     outline still reads as round.
//   - For each pixel, mix the 6 colours via Gaussian-weighted influence.
//     Anchor positions are animated by JS so colour zones flow inside
//     the silhouette.
//   - The whole silhouette can breathe without reaching the canvas edge.

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
  uniform float uOpacity;      // 0..1   whole-blob opacity
  uniform float uEdgeSoftness; // 0..1   outer-edge alpha falloff width
  uniform float uBreath;       // ~1.0   current breathing scale
  uniform float uSaturation;   // 0..1+  global saturation multiplier
  uniform float uWobble;       // 0..1   subtle silhouette deformation amount
  uniform float uWobbleSeed;   // per-blob random offset for unique wobble pattern
  uniform vec3  uBackground;   // screen background behind the blob

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
    // angle, drifting slowly with time. Max amplitude is small (about 6% radius
    // at uWobble=1.0) so the outline still reads as a smooth circle.
    float wobbleNoise = noise(vec2(cos(ang) * 1.4, sin(ang) * 1.4) + uTime * 0.06 + uWobbleSeed * 10.0);
    float deform = (wobbleNoise - 0.5) * uWobble * 0.12;
    float silhouette = 0.78 + deform;

    // Adaptive edge: keep softness limited to the rim. At maximum softness it
    // reaches about 18% inward from the local silhouette radius, so the center
    // stays sharp while the perimeter fades more into the background.
    float minFadeWidth = 0.004;
    float maxFadeWidth = silhouette * 0.18;
    float fadeWidth = mix(minFadeWidth, maxFadeWidth, uEdgeSoftness);
    float edge = 1.0 - smoothstep(silhouette - fadeWidth, silhouette, r);
    if (edge <= 0.0) discard;

    // ── Weighted Gaussian colour mix ───────────────────────────────────
    // Blend only affects color transition zones, base sigma stays consistent.
    vec3  col = vec3(0.0);
    float totalInf = 0.0;
    for (int i = 0; i < N; i++) {
      float d = distance(pos, uPositions[i]);
      float sigma = 0.18 + uBlend * 0.12;
      float inf   = exp(-d * d / (2.0 * sigma * sigma)) * uWeights[i];
      col      += uColours[i] * inf;
      totalInf += inf;
    }
    col /= max(totalInf, 1e-4);

    col = saturate3(col, uSaturation);

    col = mix(uBackground, col, edge);

    gl_FragColor = vec4(col, uOpacity);
  }
`;
