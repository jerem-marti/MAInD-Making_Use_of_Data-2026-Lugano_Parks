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
  uniform float uBlend;
  uniform float uOpacity;
  uniform float uEdgeSoftness;
  uniform float uBreath;
  uniform float uSaturation;
  uniform float uWobble;
  uniform float uWobbleSeed;

  varying vec2 vUv;

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
    float r = length(pos);
    float ang = atan(pos.y, pos.x);

    float wobbleNoise = noise(vec2(cos(ang) * 1.4, sin(ang) * 1.4) + uTime * 0.06 + uWobbleSeed * 10.0);
    float deform = (wobbleNoise - 0.5) * uWobble * 0.12;
    float silhouette = 0.78 + deform;

    float minFadeWidth = 0.004;
    float maxFadeWidth = silhouette * 0.18;
    float fadeWidth = mix(minFadeWidth, maxFadeWidth, uEdgeSoftness);
    float edge = 1.0 - smoothstep(silhouette - fadeWidth, silhouette, r);
    if (edge <= 0.0) discard;

    vec3 col = vec3(0.0);
    float totalInf = 0.0;
    for (int i = 0; i < N; i++) {
      float d = distance(pos, uPositions[i]);
      float sigma = 0.18 + uBlend * 0.12;
      float inf = exp(-d * d / (2.0 * sigma * sigma)) * uWeights[i];
      col += uColours[i] * inf;
      totalInf += inf;
    }
    col /= max(totalInf, 1e-4);
    col = saturate3(col, uSaturation);
    float alpha = edge * uOpacity;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;
