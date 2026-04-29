import type { CSSProperties } from "react";
import styles from "./LensSwatch.module.css";

export const LENSES = [
  "emotional",
  "sensory",
  "action",
  "relational",
  "infrastructure",
  "tension",
] as const;
export type Lens = (typeof LENSES)[number];

export const LENS_TOKEN: Record<Lens, string> = {
  emotional: "--color-emotional",
  sensory: "--color-sensory",
  action: "--color-action",
  relational: "--color-relational",
  infrastructure: "--color-infrastructure",
  tension: "--color-tension",
};

/**
 * Map the dataset's full category names to the short Lens key used by
 * the design tokens. Keep in one place so beat code doesn't repeat the
 * mapping.
 */
export const CATEGORY_TO_LENS: Record<string, Lens> = {
  experiential_emotional: "emotional",
  sensory_environmental: "sensory",
  action: "action",
  relational_context: "relational",
  infrastructure_amenities: "infrastructure",
  tension_complaint: "tension",
};

export type LensSwatchProps = {
  lens: Lens;
  active?: boolean;
  count?: number;
  label?: string;
  size?: number;
};

export function LensSwatch({
  lens,
  active = false,
  count,
  label,
  size = 10,
}: LensSwatchProps) {
  const dotStyle: CSSProperties = {
    width: size,
    height: size,
    background: `var(${LENS_TOKEN[lens]})`,
  };

  return (
    <span
      className={[styles.swatch, active ? styles.active : ""].join(" ").trim()}
    >
      <span className={styles.dot} style={dotStyle} aria-hidden="true" />
      {label && <span className={styles.label}>{label}</span>}
      {typeof count === "number" && (
        <span className={styles.count}>{count}</span>
      )}
    </span>
  );
}
