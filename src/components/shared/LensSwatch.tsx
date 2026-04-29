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
  countLabel?: string;
  countOpacity?: number;
  dotColor?: string;
  label?: string;
  className?: string;
  preserveLabelCase?: boolean;
  size?: number;
  style?: CSSProperties;
};

export function LensSwatch({
  lens,
  active = false,
  count,
  countLabel,
  countOpacity,
  dotColor,
  label,
  className,
  preserveLabelCase = false,
  size = 10,
  style,
}: LensSwatchProps) {
  const dotStyle: CSSProperties = {
    width: size,
    height: size,
    background: dotColor ?? `var(${LENS_TOKEN[lens]})`,
  };
  const countStyle: CSSProperties | undefined =
    typeof countOpacity === "number" ? { opacity: countOpacity } : undefined;
  const countContent = countLabel ?? count;

  return (
    <span
      className={[
        styles.swatch,
        active ? styles.active : "",
        preserveLabelCase ? styles.preserveLabelCase : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <span className={styles.dot} style={dotStyle} aria-hidden="true" />
      {label && <span className={styles.label}>{label}</span>}
      {typeof countContent !== "undefined" && (
        <span className={styles.count} style={countStyle}>
          {countContent}
        </span>
      )}
    </span>
  );
}
