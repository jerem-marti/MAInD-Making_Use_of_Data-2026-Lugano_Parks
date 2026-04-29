import { useRef, useEffect, type CSSProperties } from "react";
import { LENSES, LENS_TOKEN, type Lens } from "./LensSwatch";
import { useReducedMotion } from "../../hooks/useReducedMotion";
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

function normalizeWeights(weights: BlobV2Weights): Record<string, number> {
  const raw = LENSES.map((lens) => Math.max(0, weights[lens] ?? 0));
  const total = raw.reduce((s, v) => s + v, 0) || 1;
  const norm: Record<string, number> = {};
  LENSES.forEach((lens, i) => {
    norm[lens] = raw[i] / total;
  });
  return norm;
}

// Hue-aware angular positions — warm colors (red, orange, yellow) spread 120° apart;
// analogous pairs maximally separated: purple↔red 180°, orange↔yellow 180°.
const LENS_BASE_ANGLE: Record<string, number> = {
  emotional: 0,      // purple  — opposite tension (red)
  infrastructure: 60, // orange  — between purple and cyan, 180° from yellow
  action: 120,       // cyan    — between orange and red
  tension: 180,      // red     — opposite purple
  relational: 240,   // yellow  — opposite orange
  sensory: 300,      // mint    — between yellow and purple
};

function spotOffsets(seed: number) {
  return LENSES.map((lens) => {
    const rad = (LENS_BASE_ANGLE[lens] + seed * 45) * (Math.PI / 180);
    return { x: Math.cos(rad) * 35, y: Math.sin(rad) * 35 };
  });
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
  const reducedMotion = useReducedMotion();
  const shouldPause = paused || reducedMotion;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const spotRefs = useRef<(HTMLDivElement | null)[]>(
    Array(LENSES.length).fill(null),
  );

  const norm = normalizeWeights(weights);
  const offsets = spotOffsets(seed);
  const blurBase = Math.round(size * 0.12);
  const blurSpot = Math.round(size * 0.1);

  // Base glow uses the dominant lens so the blob's center reflects actual data
  const dominantLens = LENSES.reduce(
    (best, lens) => ((weights[lens] ?? 0) > (weights[best] ?? 0) ? lens : best),
    LENSES[0],
  );

  useEffect(() => {
    if (shouldPause) {
      if (wrapperRef.current) wrapperRef.current.style.transform = "";
      spotRefs.current.forEach((el) => {
        if (el) el.style.transform = "";
      });
      return;
    }

    const offsets = spotOffsets(seed);
    const breathPeriod = 6 + (seed % 4);
    const startTs = performance.now();
    let raf = 0;

    const animate = (now: number) => {
      const t = (now - startTs) / 1000;

      if (wrapperRef.current) {
        const scale = 1 + 0.04 * Math.sin((t / breathPeriod) * Math.PI * 2);
        wrapperRef.current.style.transform = `scale(${scale})`;
      }

      spotRefs.current.forEach((el, i) => {
        if (!el) return;
        const duration = 12 + i * 4;
        const dx =
          offsets[i].x * 0.1 * Math.sin((t / duration) * Math.PI * 2);
        const dy =
          offsets[i].y * 0.1 * Math.cos((t / duration) * Math.PI * 2);
        el.style.transform = `translate(${dx}%, ${dy}%)`;
      });

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [shouldPause, seed]);

  return (
    <div
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      className={[styles.root, className].filter(Boolean).join(" ")}
      ref={wrapperRef}
      role={ariaLabel ? "img" : undefined}
      style={{ width: size, height: size, ...style }}
    >
      {/* Base glow — uses dominant lens color so the center reflects actual data */}
      <div
        className={styles.baseGlow}
        style={{
          background: `radial-gradient(circle at center, var(${LENS_TOKEN[dominantLens]}) 0%, transparent 80%)`,
          filter: `blur(${blurBase}px)`,
        }}
      />

      {/* Six color spots — sorted ascending by weight so dominant lens paints last (on top) */}
      {LENSES.map((lens, i) => ({ lens, i, w: norm[lens] }))
        .sort((a, b) => a.w - b.w)
        .map(({ lens, i }) => {
          const w = norm[lens];
          // sqrt lifts small weights so minor lenses remain perceptible;
          // range 35%–80% gives clear size differentiation across the full weight range
          const stop = Math.round(35 + 45 * Math.sqrt(w));
          return (
            <div
              key={lens}
              className={styles.colorSpot}
              ref={(el) => {
                spotRefs.current[i] = el;
              }}
              style={{
                background: `radial-gradient(circle at ${50 + offsets[i].x}% ${50 + offsets[i].y}%, var(${LENS_TOKEN[lens]}) 0%, transparent ${stop}%)`,
                filter: `blur(${blurSpot}px)`,
              }}
            />
          );
        })}
    </div>
  );
}
