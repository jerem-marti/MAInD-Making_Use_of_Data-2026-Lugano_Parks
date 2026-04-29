import { useId, type CSSProperties } from "react";
import { LENSES, LENS_TOKEN, type Lens } from "./LensSwatch";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import styles from "./Blob.module.css";

/**
 * Soft breathing aura. Six lens-coloured radial gradients arranged
 * hexagonally inside one circle, blurred so colours bleed into each
 * other with no hard edges.
 *
 * Visual reference: Phase 1 blob prototype (test/blob_V2). At Phase 2
 * we don't try to match that prototype pixel-for-pixel — we render a
 * functional approximation good enough for the scrolly scaffolding,
 * and refine in a later pass.
 *
 * `weights` are the proportional contribution of each lens. They don't
 * need to sum to 1 — we normalise. A weight of 0 hides that gradient.
 *
 * `seed` shifts the hex orientation deterministically so two blobs on
 * the same page don't look identical.
 */
export type BlobWeights = Record<Lens, number>;

export type BlobProps = {
  weights: BlobWeights;
  size?: number;
  breathing?: boolean;
  seed?: number;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
};

export function Blob({
  weights,
  size = 320,
  breathing = true,
  seed = 0,
  className,
  style,
  ariaLabel,
}: BlobProps) {
  const reduced = useReducedMotion();
  const animate = breathing && !reduced;
  const filterId = useId();

  // Normalise weights, but keep zeros zero (so missing lenses disappear).
  const total = Object.values(weights).reduce((s, v) => s + Math.max(0, v), 0);
  const norm: BlobWeights = LENSES.reduce((acc, lens) => {
    acc[lens] = total > 0 ? Math.max(0, weights[lens]) / total : 0;
    return acc;
  }, {} as BlobWeights);

  const cx = size / 2;
  const cy = size / 2;
  const ringRadius = size * 0.22;
  const baseAngle = (seed % 60) * (Math.PI / 180);

  return (
    <svg
      className={[styles.blob, animate ? styles.breathing : "", className]
        .filter(Boolean)
        .join(" ")}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={style}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <defs>
        <filter
          id={filterId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation={size * 0.09} />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>
        {/* Backdrop circle — soft surface secondary so colours blend into
            something rather than into the page background. */}
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.42}
          fill="var(--color-surface-secondary)"
          opacity={0.6}
        />
        {LENSES.map((lens, i) => {
          const w = norm[lens];
          if (w <= 0) return null;
          const angle = baseAngle + (i / LENSES.length) * Math.PI * 2;
          const px = cx + Math.cos(angle) * ringRadius;
          const py = cy + Math.sin(angle) * ringRadius;
          const r = size * (0.18 + 0.34 * w); // bigger weight → bigger blob
          return (
            <circle
              key={lens}
              cx={px}
              cy={py}
              r={r}
              fill={`var(${LENS_TOKEN[lens]})`}
              opacity={0.55 + 0.4 * w}
            />
          );
        })}
      </g>
    </svg>
  );
}
