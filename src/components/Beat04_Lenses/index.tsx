import type { CSSProperties, ReactNode } from "react";
import { useScrollProgressValue } from "../shared/ScrollSection";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import styles from "./index.module.css";

type Lens = {
  name: string;
  gloss: string;
  english: string;
  italian: string;
  color: string;
  range: readonly [number, number];
};

type AnimatedStyle = CSSProperties & {
  "--bar-progress"?: string;
  "--content-progress"?: string;
  "--lens-color"?: string;
};

const LENSES: Lens[] = [
  {
    name: "Experiential–Emotional",
    gloss: "how the park made someone feel",
    english: "beautiful · peaceful · wonderful · relaxing · magical",
    italian: "bello · tranquillo · meraviglioso · rilassante · magico",
    color: "var(--lens-emotional, var(--color-emotional))",
    range: [0.1, 0.2],
  },
  {
    name: "Sensory–Environmental",
    gloss: "what it looked, sounded, smelled like",
    english: "green · quiet · clean · shaded · flowery · view",
    italian: "verde · silenzioso · pulito · ombreggiato · fiorito · vista",
    color: "var(--lens-sensory, var(--color-sensory))",
    range: [0.2, 0.3],
  },
  {
    name: "Action",
    gloss: "what people did there",
    english: "walk · relax · picnic · visit · play · run",
    italian: "passeggiare · rilassarsi · picnic · visitare · giocare · correre",
    color: "var(--lens-action, var(--color-action))",
    range: [0.3, 0.4],
  },
  {
    name: "Relational Context",
    gloss: "who was there, who it's for",
    english: "children · kids · families · couples · dogs",
    italian: "bambini · ragazzi · famiglie · coppie · cani",
    color: "var(--lens-relational, var(--color-relational))",
    range: [0.4, 0.5],
  },
  {
    name: "Infrastructure–Amenities",
    gloss: "what was physically there",
    english: "bench · playground · trees · parking · path · fountain",
    italian: "panchina · parco giochi · alberi · parcheggio · sentiero · fontana",
    color: "var(--lens-infrastructure, var(--color-infrastructure))",
    range: [0.5, 0.6],
  },
  {
    name: "Tension–Complaint",
    gloss: "what disappointed",
    english: "dirty · crowded · neglected · broken · noisy",
    italian: "sporco · affollato · trascurato · rotto · rumoroso",
    color: "var(--lens-tension, var(--color-tension))",
    range: [0.6, 0.7],
  },
];

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function rangeProgress(progress: number, start: number, end: number): number {
  return clamp((progress - start) / (end - start));
}

function animatedStyle(
  progress: number,
  start: number,
  end: number,
  reducedMotion: boolean,
): AnimatedStyle {
  const amount = reducedMotion ? 1 : rangeProgress(progress, start, end);

  return {
    opacity: amount,
    transform: `translateY(${16 * (1 - amount)}px)`,
  };
}

function lensStyle(
  progress: number,
  lens: Lens,
  reducedMotion: boolean,
): AnimatedStyle {
  const [start, end] = lens.range;
  const span = end - start;
  const elementProgress = reducedMotion
    ? 1
    : rangeProgress(progress, start, end);
  const barProgress = reducedMotion
    ? 1
    : rangeProgress(progress, start, start + span * 0.45);
  const contentProgress = reducedMotion
    ? 1
    : rangeProgress(progress, start + span * 0.45, end);

  return {
    "--bar-progress": barProgress.toFixed(3),
    "--content-progress": contentProgress.toFixed(3),
    "--lens-color": lens.color,
    opacity: elementProgress,
    transform: `translateY(${16 * (1 - elementProgress)}px)`,
  };
}

function EmphasisWord({ children }: { children: ReactNode }) {
  return <span className={styles.quotedWord}>{children}</span>;
}

export function Beat04Lenses() {
  const progress = useScrollProgressValue();
  const reducedMotion = useReducedMotion();
  const trackY = -progress * 1280;

  return (
    <div className={styles.stage}>
      <div
        className={styles.track}
        style={{ transform: `translateY(${trackY.toFixed(1)}px)` }}
      >
        <div
          className={styles.intro}
          style={animatedStyle(progress, 0.02, 0.1, reducedMotion)}
        >
          To read this much language, we sorted every meaningful word into one
          of six lenses. Each lens captures a different way people describe a
          place.
        </div>

        <div className={styles.lensList}>
          {LENSES.map((lens) => (
            <section
              className={styles.lens}
              key={lens.name}
              style={lensStyle(progress, lens, reducedMotion)}
            >
              <div className={styles.colorBar} aria-hidden="true" />
              <div className={styles.lensContent}>
                <div className={styles.lensHeader}>
                  <h2>{lens.name}</h2>
                  <p>{lens.gloss}</p>
                </div>
                <p className={styles.english}>{lens.english}</p>
                <p className={styles.italian}>{lens.italian}</p>
              </div>
            </section>
          ))}
        </div>

        <div
          className={styles.tensionNote}
          style={animatedStyle(progress, 0.75, 0.85, reducedMotion)}
        >
          <p>
            A note before we go further. Across all 3,400+ words from all five
            parks, only about <strong>2%</strong> belong to the
            Tension–Complaint lens. Either Lugano's parks are unusually free of
            friction — or people who are unhappy don't tend to write reviews.
          </p>
          <p>
            <em>Hold that question.</em>
          </p>
        </div>

        <p
          className={styles.ambiguityNote}
          style={animatedStyle(progress, 0.9, 1, reducedMotion)}
        >
          Some words sit between two lenses. <EmphasisWord>Quiet</EmphasisWord>{" "}
          can be sensory or emotional. <EmphasisWord>Green</EmphasisWord> can
          be a colour or a value judgement. We chose the most plausible reading
          from context. Other readings are possible.
        </p>
      </div>
    </div>
  );
}
