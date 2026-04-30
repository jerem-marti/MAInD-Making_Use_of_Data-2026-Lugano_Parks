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
          An Aura of Word begins with Google Reviews from Lugano’s five most-reviewed public green spaces: 
          <strong> Parco Ciani</strong>, <strong>Parco Tassino</strong>,{" "}
          <strong>Parco San Michele</strong>,{" "}
          <strong>Parco Panoramico Paradiso</strong>, and{" "}
          <strong>Parco Lambertenghi</strong>.
        </p>
        <p
          style={{
            opacity: paragraphProgress[1],
            transform: `translateY(${20 * (1 - paragraphProgress[1])}px)`,
          }}
        >
          A Google Review is not a survey. It is what someone chose to write after being there: to praise, to complain, to remember a view, a walk, a bench, a feeling. Most people do not write at all. So this is not a portrait of Lugano’s parks as they are, but of what gets written down about them.
        </p>
        <p
          style={{
            opacity: paragraphProgress[2],
            transform: `translateY(${20 * (1 - paragraphProgress[2])}px)`,
          }}
        >
          Through six semantic lenses, these written traces become weighted fields of colour and form. Each aura looks beneath the rating to show how a park is sensed, used, remembered, criticised, and valued — not as a final truth, but as a felt portrait open to recognition and debate.
        </p>
      </div>
    </div>
  );
}
