import { useScrollProgressValue } from "../shared/ScrollSection";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import styles from "./index.module.css";

const PARAGRAPH_RANGES = [
  [0.1, 0.25],
  [0.3, 0.45],
  [0.5, 0.65],
] as const;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function rangeProgress(progress: number, start: number, end: number): number {
  return clamp((progress - start) / (end - start));
}

export function Beat02Method() {
  const progress = useScrollProgressValue();
  const reducedMotion = useReducedMotion();
  const paragraphProgress = PARAGRAPH_RANGES.map(([start, end]) =>
    reducedMotion ? 1 : rangeProgress(progress, start, end),
  );

  return (
    <div className={styles.stage}>
      <div className={styles.copy}>
        <p
          style={{
            opacity: paragraphProgress[0],
            transform: `translateY(${20 * (1 - paragraphProgress[0])}px)`,
          }}
        >
          We collected the Google reviews of five public green spaces in Lugano:
          Parco Ciani, Parco Tassino, Parco San Michele, Parco Panoramico
          Paradiso, and Parco Lambertenghi. Together, these are the
          most-reviewed green spaces in the city.
        </p>
        <p
          style={{
            opacity: paragraphProgress[1],
            transform: `translateY(${20 * (1 - paragraphProgress[1])}px)`,
          }}
        >
          Reviews were originally written in many languages. We translated them
          all into English to read them together. Translation always loses
          something, and we know it.
        </p>
        <p
          style={{
            opacity: paragraphProgress[2],
            transform: `translateY(${20 * (1 - paragraphProgress[2])}px)`,
          }}
        >
          A Google review is not a survey. It is what someone chose to write,
          on their phone, after a visit. Some people write to praise. Some to
          complain. Most people don't write at all. So this is not a portrait
          of Lugano's parks. It is a portrait of{" "}
          <em>what gets written down about them</em> — which is something
          different, and worth looking at on its own terms.
        </p>
      </div>
    </div>
  );
}
