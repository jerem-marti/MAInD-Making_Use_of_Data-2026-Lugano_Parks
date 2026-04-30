import { useEffect, useState, type CSSProperties } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useScrollProgressValue } from "../shared/ScrollSection";
import excerptsPool from "../../data/excerpts-pool.json";
import styles from "./index.module.css";

type FragmentStyle = CSSProperties & {
  "--left"?: string;
  "--right"?: string;
  "--top"?: string;
  "--bottom"?: string;
  "--width": string;
  "--from-x": string;
  "--from-y": string;
  "--to-x": string;
  "--to-y": string;
  "--duration": string;
  "--delay": string;
  "--rotation": string;
};

const SELECTED_EXCERPT_INDICES = [4, 16, 53, 57, 79, 87, 82, 68] as const;

const POSITIONS = [
  { left: "6vw", top: "11vh", width: "210px" },
  { right: "7vw", top: "13vh", width: "235px" },
  { left: "11vw", top: "39vh", width: "230px" },
  { right: "10vw", top: "42vh", width: "225px" },
  { left: "7vw", bottom: "16vh", width: "240px" },
  { right: "7vw", bottom: "14vh", width: "245px" },
  { left: "32vw", top: "18vh", width: "230px" },
  { right: "31vw", bottom: "8vh", width: "250px" },
] as const;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function seededUnit(seed: number): number {
  const value = Math.sin((seed + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function seededRange(seed: number, min: number, max: number): number {
  return min + seededUnit(seed) * (max - min);
}

function makeFragmentStyle(index: number): FragmentStyle {
  const position = POSITIONS[index];
  const angle = seededRange(index + 20, 0, Math.PI * 2);
  const distance = seededRange(index + 40, 30, 60);
  const driftX = Math.cos(angle) * distance;
  const driftY = Math.sin(angle) * distance;
  const duration = seededRange(index + 60, 20, 40);

  return {
    "--left": "left" in position ? position.left : undefined,
    "--right": "right" in position ? position.right : undefined,
    "--top": "top" in position ? position.top : undefined,
    "--bottom": "bottom" in position ? position.bottom : undefined,
    "--width": position.width,
    "--from-x": `${(-driftX / 2).toFixed(1)}px`,
    "--from-y": `${(-driftY / 2).toFixed(1)}px`,
    "--to-x": `${(driftX / 2).toFixed(1)}px`,
    "--to-y": `${(driftY / 2).toFixed(1)}px`,
    "--duration": `${duration.toFixed(1)}s`,
    "--delay": `${(-seededRange(index + 80, 0, duration)).toFixed(1)}s`,
    "--rotation": `${seededRange(index, -4, 4).toFixed(2)}deg`,
  };
}

const FRAGMENTS = SELECTED_EXCERPT_INDICES.map((excerptIndex, index) => ({
  text: excerptsPool[excerptIndex],
  style: makeFragmentStyle(index),
}));

type StageStyle = CSSProperties & {
  "--fragment-opacity": string;
  "--fragments-y": string;
  "--scroll-cue-opacity": string;
};

export function Beat01Opening() {
  const progress = useScrollProgressValue();
  const reducedMotion = useReducedMotion();
  const [introStep, setIntroStep] = useState(0);

  useEffect(() => {
    const titleTimer = window.setTimeout(() => setIntroStep(1), 1800);
    const subtitleTimer = window.setTimeout(() => setIntroStep(2), 2600);

    return () => {
      window.clearTimeout(titleTimer);
      window.clearTimeout(subtitleTimer);
    };
  }, []);

  const titleVisible = introStep >= 1;
  const subtitleVisible = introStep >= 2;
  const fragmentOpacity = titleVisible ? 0.35 : 0.5;
  const fragmentsY = reducedMotion ? 0 : -progress * 180;
  const titleOffset = reducedMotion || titleVisible ? 0 : 20;
  const scrollCueOpacity = subtitleVisible ? 1 - clamp(progress / 0.12) : 0;

  const stageStyle: StageStyle = {
    "--fragment-opacity": fragmentOpacity.toFixed(3),
    "--fragments-y": `${fragmentsY.toFixed(1)}px`,
    "--scroll-cue-opacity": scrollCueOpacity.toFixed(3),
  };

  return (
    <div className={styles.stage} style={stageStyle}>
      <div className={styles.fragments} aria-hidden="true">
        {FRAGMENTS.map((fragment) => (
          <span
            className={styles.fragment}
            key={fragment.text}
            style={fragment.style}
          >
            <span className={styles.fragmentText}>{fragment.text}</span>
          </span>
        ))}
      </div>

      <div className={styles.title} aria-live="off">
        <h1
          className={styles.heading}
          style={{
            opacity: titleVisible ? 1 : 0,
            transform: `translateY(${titleOffset.toFixed(1)}px)`,
          }}
        >
          Aura of Words
        </h1>
        <p
          className={styles.subtitle}
          style={{ opacity: subtitleVisible ? 1 : 0 }}
        >
          Green Spaces of Lugano
        </p>
      </div>

      <div className={styles.scrollCue} aria-hidden="true">
        <span>Scroll</span>
      </div>
    </div>
  );
}
