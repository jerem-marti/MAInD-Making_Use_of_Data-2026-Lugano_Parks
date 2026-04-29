import type { CSSProperties } from "react";
import { useScrollProgressValue } from "../shared/ScrollSection";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import parksData from "../../data/parks.json";
import styles from "./index.module.css";

type BarStyle = CSSProperties & {
  "--bar-width": string;
};

const BAR_RANGES = [
  [0.2, 0.35],
  [0.25, 0.4],
  [0.3, 0.45],
  [0.35, 0.5],
  [0.4, 0.55],
] as const;

const PARKS = [...parksData.parks].sort((a, b) => b.totalWords - a.totalWords);
const MAX_TOTAL_WORDS = PARKS[0]?.totalWords ?? 1;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function rangeProgress(progress: number, start: number, end: number): number {
  return clamp((progress - start) / (end - start));
}

export function Beat03Volume() {
  const progress = useScrollProgressValue();
  const reducedMotion = useReducedMotion();
  const headingProgress = reducedMotion ? 1 : rangeProgress(progress, 0.1, 0.22);
  const captionProgress = reducedMotion
    ? 1
    : rangeProgress(progress, 0.6, 0.75);

  return (
    <div className={styles.stage}>
      <div className={styles.inner}>
        <p
          className={styles.heading}
          style={{
            opacity: headingProgress,
            transform: `translateY(${20 * (1 - headingProgress)}px)`,
          }}
        >
          Some parks are reviewed a lot. Others, almost not at all.
        </p>

        <div className={styles.chart} aria-label="Reviewed words per park">
          {PARKS.map((park, index) => {
            const [start, end] = BAR_RANGES[index];
            const barProgress = reducedMotion
              ? 1
              : rangeProgress(progress, start, end);
            const finalWidth = (park.totalWords / MAX_TOTAL_WORDS) * 80;
            const barStyle: BarStyle = {
              "--bar-width": `${(finalWidth * barProgress).toFixed(3)}%`,
            };

            return (
              <div className={styles.row} key={park.id} style={barStyle}>
                <div className={styles.parkName}>{park.name}</div>
                <div className={styles.barArea}>
                  <div className={styles.bar} />
                  <div className={styles.value}>{park.totalWords}</div>
                </div>
              </div>
            );
          })}
        </div>

        <p
          className={styles.caption}
          style={{
            opacity: captionProgress,
            transform: `translateY(${20 * (1 - captionProgress)}px)`,
          }}
        >
          Parco Ciani has roughly <strong>twenty-five times</strong> more
          reviewed words than Parco Lambertenghi. We kept all five anyway. The
          imbalance is part of the finding: in Lugano, as in most cities,
          attention is not evenly distributed.
        </p>
      </div>
    </div>
  );
}
