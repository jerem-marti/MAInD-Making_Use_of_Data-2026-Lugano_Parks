import { useEffect, useRef, type CSSProperties } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { LENSES, LENS_TOKEN, type Lens } from "./LensSwatch";
import { FRAG, VERT } from "./BlobV2Shaders";
import styles from "./BlobV2.module.css";

export type BlobV2Weights = Record<Lens, number>;

export type BlobV2Props = {
  weights: BlobV2Weights;
  size?: number;
  paused?: boolean;
  seed?: number;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
};

type Drift = {
  ax: number;
  ay: number;
  px: number;
  py: number;
  rx: number;
  ry: number;
};

function seededUnit(seed: number): number {
  const value = Math.sin((seed + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function defaultPositions() {
  const eccentricity = 0.42;
  return LENSES.map((_, i) => {
    const theta = (i / LENSES.length) * Math.PI * 2 - Math.PI / 2;
    return [eccentricity * Math.cos(theta), eccentricity * Math.sin(theta)] as const;
  });
}

function makeDrift(seed: number): Drift[] {
  return LENSES.map((_, i) => ({
    ax: 0.05 + seededUnit(seed + i * 13) * 0.04,
    ay: 0.045 + seededUnit(seed + i * 17) * 0.04,
    px: seededUnit(seed + i * 19) * Math.PI * 2,
    py: seededUnit(seed + i * 23) * Math.PI * 2,
    rx: 0.025 + seededUnit(seed + i * 29) * 0.02,
    ry: 0.025 + seededUnit(seed + i * 31) * 0.02,
  }));
}

function parseCssColor(color: string): THREE.Vector3 {
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) {
    const hex = trimmed.replace("#", "");
    const normalized =
      hex.length === 3
        ? hex
            .split("")
            .map((part) => part + part)
            .join("")
        : hex;
    return new THREE.Vector3(
      parseInt(normalized.slice(0, 2), 16) / 255,
      parseInt(normalized.slice(2, 4), 16) / 255,
      parseInt(normalized.slice(4, 6), 16) / 255,
    );
  }

  const match = trimmed.match(/rgba?\(([^)]+)\)/);
  if (match) {
    const [r, g, b] = match[1].split(",").map((part) => parseFloat(part));
    return new THREE.Vector3(r / 255, g / 255, b / 255);
  }

  return new THREE.Vector3(0.5, 0.5, 0.5);
}

function readToken(token: string): THREE.Vector3 {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return parseCssColor(value || "#9A9A9A");
}

function weightsArray(weights: BlobV2Weights): number[] {
  const raw = LENSES.map((lens) => Math.max(0, weights[lens] ?? 0));
  const total = raw.reduce((sum, value) => sum + value, 0) || 1;
  return raw.map((value) => value / total);
}

export function BlobV2({
  weights,
  size = 180,
  paused = false,
  seed = 0,
  className,
  style,
  ariaLabel,
}: BlobV2Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useReducedMotion();
  const shouldPause = paused || reducedMotion;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(size, size);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const colours = LENSES.map((lens) => readToken(LENS_TOKEN[lens]));
    const positions = LENSES.map(() => new THREE.Vector2());
    const weightValues = new Float32Array(weightsArray(weights));
    const basePositions = defaultPositions();
    const drift = makeDrift(seed);

    const uniforms = {
      uColours: { value: colours },
      uPositions: { value: positions },
      uWeights: { value: weightValues },
      uTime: { value: 0 },
      uBlend: { value: 0.55 },
      uOpacity: { value: 1 },
      uEdgeSoftness: { value: 0.87 },
      uBreath: { value: 1 },
      uSaturation: { value: 1.05 },
      uWobble: { value: 1 },
      uWobbleSeed: { value: seededUnit(seed + 97) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      premultipliedAlpha: true,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let raf = 0;
    const startTs = performance.now();

    const render = (now: number) => {
      const time = (now - startTs) / 1000;
      uniforms.uTime.value = time;

      LENSES.forEach((_, i) => {
        const [bx, by] = basePositions[i];
        const signature = drift[i];
        const dx =
          Math.sin(time * signature.ax * Math.PI * 2 + signature.px) *
          signature.rx *
          0.6;
        const dy =
          Math.cos(time * signature.ay * Math.PI * 2 + signature.py) *
          signature.ry *
          0.6;
        positions[i].set(bx + dx, by + dy);
      });

      uniforms.uBreath.value =
        shouldPause || 5.5 <= 0
          ? 1
          : 1 + 0.04 * Math.sin((time / 5.5) * Math.PI * 2);

      renderer.render(scene, camera);
      if (!shouldPause) raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, [paused, reducedMotion, seed, shouldPause, size, weights]);

  return (
    <div
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      className={[styles.root, className].filter(Boolean).join(" ")}
      ref={rootRef}
      role={ariaLabel ? "img" : undefined}
      style={{ width: size, height: size, ...style }}
    >
      <canvas
        className={styles.canvas}
        height={size}
        ref={canvasRef}
        width={size}
      />
    </div>
  );
}
