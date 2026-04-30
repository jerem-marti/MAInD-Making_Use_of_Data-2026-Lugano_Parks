import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { LensSwatch, type Lens } from "../shared/LensSwatch";
import { useScrollProgressValue } from "../shared/ScrollSection";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import parksData from "../../data/parks.json";
import styles from "./index.module.css";

type ExampleWord = {
  text: string;
  dataWord: string;
};

type TagFrame = {
  word: string;
  lens: Lens;
  lensName: string;
  range: readonly [number, number];
  caption: ReactNode;
};

type Connector = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type Point = {
  x: number;
  y: number;
};

type LayoutGeometry = {
  width: number;
  height: number;
  blobCenter: Point;
  words: Record<string, Point>;
};

type Particle = {
  id: number;
  lens: Lens;
  edge: number;
  edgePosition: number;
  delay: number;
  scatterAngle: number;
  scatterRadius: number;
  curveOffset: number;
  radius: number;
};

type StageStyle = CSSProperties & {
  "--active-halo": string;
};

type WordStyle = CSSProperties & {
  "--word-lens-color"?: string;
  "--word-underline-opacity"?: string;
};

const EXAMPLE_WORDS: ExampleWord[] = [
  { text: "A", dataWord: "a" },
  { text: "quiet", dataWord: "quiet" },
  { text: "spot,", dataWord: "spot" },
  { text: "perfect", dataWord: "perfect" },
  { text: "for", dataWord: "for" },
  { text: "families.", dataWord: "families" },
  { text: "The", dataWord: "the" },
  { text: "benches", dataWord: "benches" },
  { text: "are", dataWord: "are" },
  { text: "nice", dataWord: "nice" },
  { text: "but", dataWord: "but" },
  { text: "the", dataWord: "the" },
  { text: "playground", dataWord: "playground" },
  { text: "is", dataWord: "is" },
  { text: "a", dataWord: "a" },
  { text: "little", dataWord: "little" },
  { text: "neglected.", dataWord: "neglected" },
];

const TAG_FRAMES: TagFrame[] = [
  {
    word: "quiet",
    lens: "sensory",
    lensName: "Sensory–Environmental",
    range: [0.1, 0.18],
    caption: (
      <>
        <CaptionWord>'quiet'</CaptionWord> — describes how the place sounds and
        feels. Sensory–Environmental.
      </>
    ),
  },
  {
    word: "families",
    lens: "relational",
    lensName: "Relational Context",
    range: [0.2, 0.28],
    caption: (
      <>
        <CaptionWord>'families'</CaptionWord> — names who's there. Relational
        Context.
      </>
    ),
  },
  {
    word: "benches",
    lens: "infrastructure",
    lensName: "Infrastructure",
    range: [0.3, 0.38],
    caption: (
      <>
        <CaptionWord>'benches'</CaptionWord> — physical things in the park.
        Infrastructure.
      </>
    ),
  },
  {
    word: "playground",
    lens: "infrastructure",
    lensName: "Infrastructure",
    range: [0.4, 0.48],
    caption: (
      <>
        <CaptionWord>'playground'</CaptionWord> — also Infrastructure. The lens
        gets heavier each time it appears.
      </>
    ),
  },
  {
    word: "neglected",
    lens: "tension",
    lensName: "Tension–Complaint",
    range: [0.5, 0.62],
    caption: (
      <>
        <CaptionWord>'neglected'</CaptionWord> — a complaint.
        Tension–Complaint.
      </>
    ),
  },
];

const SWATCHES: Array<{ lens: Lens; label: string }> = [
  { lens: "emotional", label: "Emotional" },
  { lens: "sensory", label: "Sensory" },
  { lens: "action", label: "Action" },
  { lens: "relational", label: "Relational" },
  { lens: "infrastructure", label: "Infrastructure" },
  { lens: "tension", label: "Tension" },
];

const LENS_VAR: Record<Lens, string> = {
  emotional: "var(--lens-emotional, var(--color-emotional))",
  sensory: "var(--lens-sensory, var(--color-sensory))",
  action: "var(--lens-action, var(--color-action))",
  relational: "var(--lens-relational, var(--color-relational))",
  infrastructure: "var(--lens-infrastructure, var(--color-infrastructure))",
  tension: "var(--lens-tension, var(--color-tension))",
};

const WORD_DESTINATIONS: Record<string, { x: number; y: number; r: number }> = {
  quiet: { x: -24, y: -18, r: 15 },
  families: { x: 24, y: -14, r: 15 },
  benches: { x: -10, y: 4, r: 20 },
  playground: { x: 12, y: 10, r: 21 },
  neglected: { x: 0, y: 27, r: 14 },
};

const CIANI_WEIGHTS = parksData.parks.find((park) => park.id === "ciani")
  ?.categoryWeights;

const CIANI_LENS_WEIGHTS: Record<Lens, number> = {
  emotional: CIANI_WEIGHTS?.experiential_emotional ?? 0.4611,
  sensory: CIANI_WEIGHTS?.sensory_environmental ?? 0.1796,
  action: CIANI_WEIGHTS?.action ?? 0.2043,
  relational: CIANI_WEIGHTS?.relational_context ?? 0.0475,
  infrastructure: CIANI_WEIGHTS?.infrastructure_amenities ?? 0.0969,
  tension: CIANI_WEIGHTS?.tension_complaint ?? 0.0105,
};

const PARTICLE_COUNT = 200;

function seededUnit(seed: number): number {
  const value = Math.sin((seed + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function pickLens(seed: number): Lens {
  const total = SWATCHES.reduce(
    (sum, swatch) => sum + CIANI_LENS_WEIGHTS[swatch.lens],
    0,
  );
  const target = seededUnit(seed) * total;
  let cumulative = 0;

  for (const swatch of SWATCHES) {
    cumulative += CIANI_LENS_WEIGHTS[swatch.lens];
    if (target <= cumulative) return swatch.lens;
  }

  return "emotional";
}

const PARTICLES: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  lens: pickLens(i + 11),
  edge: Math.floor(seededUnit(i + 23) * 4),
  edgePosition: seededUnit(i + 37),
  delay: seededUnit(i + 53) * 0.78,
  scatterAngle: seededUnit(i + 71) * Math.PI * 2,
  scatterRadius: Math.sqrt(seededUnit(i + 89)) * 170,
  curveOffset: -160 + seededUnit(i + 107) * 320,
  radius: 4 + seededUnit(i + 131) * 8,
}));

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function rangeProgress(progress: number, start: number, end: number): number {
  return clamp((progress - start) / (end - start));
}

function easeInOut(value: number): number {
  return value * value * (3 - 2 * value);
}

function quadraticPoint(
  start: Point,
  control: Point,
  end: Point,
  progress: number,
): Point {
  const t = easeInOut(progress);
  const inverse = 1 - t;

  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

function controlPoint(start: Point, end: Point, offset: number): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));

  return {
    x: (start.x + end.x) / 2 + (-dy / length) * offset,
    y: (start.y + end.y) / 2 + (dx / length) * offset,
  };
}

function particleStart(particle: Particle, geometry: LayoutGeometry): Point {
  const margin = 96;
  const x = particle.edgePosition * geometry.width;
  const y = particle.edgePosition * geometry.height;

  if (particle.edge === 0) return { x, y: -margin };
  if (particle.edge === 1) return { x: geometry.width + margin, y };
  if (particle.edge === 2) return { x, y: geometry.height + margin };
  return { x: -margin, y };
}

function frameProgress(
  progress: number,
  frame: TagFrame,
  reducedMotion: boolean,
): number {
  return reducedMotion ? 1 : rangeProgress(progress, frame.range[0], frame.range[1]);
}

function colorMix(
  toColor: string,
  fromColor: string,
  amount: number,
): string {
  return `color-mix(in srgb, ${toColor} ${(clamp(amount) * 100).toFixed(1)}%, ${fromColor})`;
}

function CaptionWord({ children }: { children: ReactNode }) {
  return <span className={styles.captionWord}>{children}</span>;
}

function lineState(
  progress: number,
  frame: TagFrame,
  reducedMotion: boolean,
): { opacity: number; dashOffset: number; highlight: number } {
  if (reducedMotion) return { opacity: 0.2, dashOffset: 0, highlight: 0 };

  const [start, end] = frame.range;
  const drawEnd = start + (end - start) * 0.65;
  const traceStart = drawEnd;
  const drawProgress = rangeProgress(progress, start, drawEnd);
  const traceProgress = rangeProgress(progress, traceStart, end);
  const opacity =
    drawProgress <= 0
      ? 0
      : drawProgress < 1
        ? drawProgress
        : 1 - traceProgress * 0.8;

  const highlight = drawProgress >= 1 ? Math.max(0, 1 - traceProgress) : 0;

  return {
    opacity,
    dashOffset: 1 - drawProgress,
    highlight,
  };
}

function captionOpacity(
  progress: number,
  frame: TagFrame,
  index: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;

  const nextFrame = TAG_FRAMES[index + 1];
  const fadeIn = rangeProgress(progress, frame.range[0], frame.range[0] + 0.02);
  const fadeOutStart = nextFrame?.range[0] ?? 0.65;
  const fadeOut = 1 - rangeProgress(progress, fadeOutStart, fadeOutStart + 0.02);

  return Math.min(fadeIn, fadeOut);
}

function swatchCount(lens: Lens, progress: number, reducedMotion: boolean): number {
  return TAG_FRAMES.reduce((count, frame) => {
    if (frame.lens !== lens) return count;
    return count + (frameProgress(progress, frame, reducedMotion) > 0 ? 1 : 0);
  }, 0);
}

function swatchActivation(
  lens: Lens,
  progress: number,
  reducedMotion: boolean,
): number {
  return Math.max(
    0,
    ...TAG_FRAMES.filter((frame) => frame.lens === lens).map((frame) =>
      frameProgress(progress, frame, reducedMotion),
    ),
  );
}

export function Beat05WorkedExample() {
  const progress = useScrollProgressValue();
  const reducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const blobAnchorRef = useRef<HTMLDivElement | null>(null);
  const wordRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const swatchRefs = useRef<Record<Lens, HTMLSpanElement | null>>({
    emotional: null,
    sensory: null,
    action: null,
    relational: null,
    infrastructure: null,
    tension: null,
  });
  const [connectors, setConnectors] = useState<Record<string, Connector>>({});
  const [geometry, setGeometry] = useState<LayoutGeometry | null>(null);

  const frameAmounts = TAG_FRAMES.reduce<Record<string, number>>((acc, frame) => {
    acc[frame.word] = frameProgress(progress, frame, reducedMotion);
    return acc;
  }, {});
  const f7Progress = reducedMotion ? 1 : rangeProgress(progress, 0.65, 0.82);
  const f8Progress = reducedMotion ? 1 : rangeProgress(progress, 0.82, 1);
  const transcriptProgress = reducedMotion ? 1 : f7Progress;
  const connectorTraceOpacity = reducedMotion
    ? 0
    : 1 - rangeProgress(progress, 0.65, 0.72);
  const activeFrame =
    [...TAG_FRAMES].reverse().find((frame) => frameAmounts[frame.word] > 0) ??
    null;
  const activeHalo = activeFrame && transcriptProgress <= 0
    ? colorMix(LENS_VAR[activeFrame.lens], "transparent", frameAmounts[activeFrame.word] * 0.3)
    : "transparent";
  const stageStyle: StageStyle = {
    "--active-halo": activeHalo,
  };
  const f6NoteProgress = reducedMotion
    ? 0
    : Math.min(
        rangeProgress(progress, 0.53, 0.62),
        1 - rangeProgress(progress, 0.65, 0.67),
      );
  const f7CaptionProgress = reducedMotion
    ? 1
    : Math.min(
        rangeProgress(progress, 0.78, 0.82),
        1 - rangeProgress(progress, 0.82, 0.86),
      );
  const f8CaptionProgress = reducedMotion
    ? 1
    : rangeProgress(progress, 0.92, 1);
  const particleProgresses = PARTICLES.map((particle) =>
    reducedMotion
      ? 1
      : rangeProgress(f8Progress, particle.delay, Math.min(1, particle.delay + 0.28)),
  );
  const arrivedFraction =
    particleProgresses.reduce((sum, amount) => sum + amount, 0) /
    PARTICLES.length;
  const blobDiameter = 80 + 280 * arrivedFraction;
  const blobScale = blobDiameter / 360;
  const blobBlur = 15 * f7Progress + 20 * f8Progress;

  useLayoutEffect(() => {
    let raf = 0;

    const measure = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const stage = stageRef.current;
        if (!stage) return;

        const stageRect = stage.getBoundingClientRect();
        const nextConnectors: Record<string, Connector> = {};
        const nextWords: Record<string, Point> = {};
        const blobRect = blobAnchorRef.current?.getBoundingClientRect();

        TAG_FRAMES.forEach((frame) => {
          const word = wordRefs.current[frame.word];
          const swatch = swatchRefs.current[frame.lens];
          if (!word) return;

          const wordRect = word.getBoundingClientRect();
          nextWords[frame.word] = {
            x: wordRect.left + wordRect.width / 2 - stageRect.left,
            y: wordRect.top + wordRect.height / 2 - stageRect.top,
          };

          if (!swatch) return;
          const swatchRect = swatch.getBoundingClientRect();
          nextConnectors[frame.word] = {
            x1: nextWords[frame.word].x,
            y1: wordRect.bottom - stageRect.top,
            x2: swatchRect.left + swatchRect.width / 2 - stageRect.left,
            y2: swatchRect.top - stageRect.top,
          };
        });

        setConnectors(nextConnectors);
        setGeometry({
          width: stageRect.width,
          height: stageRect.height,
          blobCenter: blobRect
            ? {
                x: blobRect.left + blobRect.width / 2 - stageRect.left,
                y: blobRect.top + blobRect.height / 2 - stageRect.top,
              }
            : {
                x: stageRect.width / 2,
                y: stageRect.height / 2 + 72,
              },
          words: nextWords,
        });
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts) return;
    let cancelled = false;
    fonts.ready.then(() => {
      if (cancelled) return;
      window.dispatchEvent(new Event("resize"));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.stage} ref={stageRef} style={stageStyle}>
      <svg className={styles.connectorLayer} aria-hidden="true">
        <defs>
          <filter
            id="beat05-blob-blur"
            x="-25%"
            y="-25%"
            width="150%"
            height="150%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation={blobBlur} />
          </filter>
        </defs>
        {TAG_FRAMES.map((frame) => {
          const connector = connectors[frame.word];
          if (!connector) return null;
          const state = lineState(progress, frame, reducedMotion);

          return (
            <path
              className={styles.connector}
              d={`M ${connector.x1} ${connector.y1} L ${connector.x2} ${connector.y2}`}
              key={frame.word}
              pathLength={1}
              style={{
                opacity: state.opacity * connectorTraceOpacity,
                stroke: LENS_VAR[frame.lens],
                strokeDashoffset: state.dashOffset,
                filter: state.highlight > 0
                  ? `saturate(${1 + state.highlight * 0.7}) brightness(${1 + state.highlight * 0.35})`
                  : undefined,
              }}
            />
          );
        })}
        {geometry && (
          <g
            className={
              f8Progress >= 0.995 && !reducedMotion ? styles.breathingBlob : ""
            }
            filter="url(#beat05-blob-blur)"
            style={{
              transformOrigin: `${geometry.blobCenter.x}px ${geometry.blobCenter.y}px`,
            }}
          >
            {TAG_FRAMES.map((frame, index) => {
              const start = geometry.words[frame.word];
              if (!start) return null;

              const destination = WORD_DESTINATIONS[frame.word];
              const local = rangeProgress(
                f7Progress,
                index * 0.08,
                index * 0.08 + 0.58,
              );
              const scale = blobDiameter / 80;
              const end = {
                x: geometry.blobCenter.x + destination.x * scale,
                y: geometry.blobCenter.y + destination.y * scale,
              };
              const control = controlPoint(
                start,
                end,
                -80 + seededUnit(index + 201) * 160,
              );
              const point = quadraticPoint(start, control, end, local);
              const opacity = reducedMotion
                ? 1
                : rangeProgress(f7Progress, index * 0.08, index * 0.08 + 0.08);

              return (
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill={LENS_VAR[frame.lens]}
                  key={frame.word}
                  opacity={opacity}
                  r={destination.r * scale}
                />
              );
            })}
            {PARTICLES.map((particle, index) => {
              const local = particleProgresses[index];
              const start = particleStart(particle, geometry);
              const destination = {
                x:
                  geometry.blobCenter.x +
                  Math.cos(particle.scatterAngle) *
                    particle.scatterRadius *
                    blobScale,
                y:
                  geometry.blobCenter.y +
                  Math.sin(particle.scatterAngle) *
                    particle.scatterRadius *
                    blobScale,
              };
              const control = controlPoint(
                start,
                destination,
                particle.curveOffset,
              );
              const point = quadraticPoint(start, control, destination, local);
              const opacity = f8Progress <= 0 && !reducedMotion
                ? 0
                : rangeProgress(local, 0, 0.12);

              return (
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill={LENS_VAR[particle.lens]}
                  key={particle.id}
                  opacity={opacity * 0.82}
                  r={particle.radius * (0.65 + local * 0.6)}
                />
              );
            })}
          </g>
        )}
      </svg>

      <div className={styles.topZone}>
        <p className={styles.label}>A SINGLE REVIEW</p>
        <p className={styles.sentence}>
          {EXAMPLE_WORDS.map((word, index) => {
            const frame = TAG_FRAMES.find(
              (candidate) => candidate.word === word.dataWord,
            );
            const amount = frame ? frameAmounts[frame.word] : 0;
            const isActive =
              activeFrame?.word === word.dataWord && transcriptProgress <= 0;
            const taggedColor = frame
              ? colorMix(
                  LENS_VAR[frame.lens],
                  "var(--ink, var(--color-text-secondary))",
                  amount,
                )
              : undefined;
            const baseColor = taggedColor ?? "var(--ink, var(--color-text-secondary))";
            const wordColor =
              transcriptProgress > 0
                ? colorMix(
                    "var(--ink-faint, var(--color-text-quaternary))",
                    baseColor,
                    transcriptProgress,
                  )
                : taggedColor;
            const wordStyle: WordStyle = {
              ...(wordColor ? { color: wordColor } : {}),
              ...(frame
                ? {
                    "--word-lens-color": LENS_VAR[frame.lens],
                    "--word-underline-opacity": transcriptProgress.toFixed(3),
                  }
                : {}),
            };

            return (
              <span key={`${word.dataWord}-${index}`}>
                <span
                  className={[
                    styles.word,
                    frame ? styles.taggedWord : "",
                    isActive ? styles.activeWord : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-word={word.dataWord}
                  ref={
                    frame
                      ? (node) => {
                          wordRefs.current[frame.word] = node;
                        }
                      : undefined
                  }
                  style={wordStyle}
                >
                  {word.text}
                </span>
                {index < EXAMPLE_WORDS.length - 1 ? " " : ""}
              </span>
            );
          })}
        </p>
        <div className={styles.rule} aria-hidden="true" />
        <p className={styles.scrollHint}>
          Scroll to see how this review gets read.
        </p>
      </div>

      <div className={styles.captionRegion}>
        <div className={styles.blobAnchor} ref={blobAnchorRef} aria-hidden="true" />
        {TAG_FRAMES.map((frame, index) => {
          const opacity = captionOpacity(progress, frame, index, reducedMotion);

          return (
            <p
              className={styles.teachingCaption}
              key={frame.word}
              style={{
                opacity,
                transform: `translate(-50%, -50%) translateY(${16 * (1 - opacity)}px)`,
              }}
            >
              {frame.caption}
            </p>
          );
        })}
        <p
          className={styles.honestyNote}
          style={{
            opacity: f6NoteProgress,
            transform: `translateX(-50%) translateY(${12 * (1 - f6NoteProgress)}px)`,
          }}
        >
          Some words sit between two lenses. <CaptionWord>'Neglected'</CaptionWord>{" "}
          is the most complaint-coloured of the five — but it's also describing
          something physical. We chose the most plausible reading. Other
          readings are possible.
        </p>
        <p
          className={styles.f7Caption}
          style={{
            opacity: f7CaptionProgress,
            transform: `translateX(-50%) translateY(${12 * (1 - f7CaptionProgress)}px)`,
          }}
        >
          Five words. A tiny portrait, already.
        </p>
        <p
          className={styles.f8Caption}
          style={{
            opacity: f8CaptionProgress,
            transform: `translateX(-50%) translateY(${16 * (1 - f8CaptionProgress)}px)`,
          }}
        >
          Now imagine that, for thousands of words. That's an aura.
        </p>
      </div>

      <div className={styles.swatchStrip} aria-label="Lens reading counters">
        {SWATCHES.map((swatch) => {
          const activation = swatchActivation(
            swatch.lens,
            progress,
            reducedMotion,
          );
          const count = swatchCount(swatch.lens, progress, reducedMotion);
          const isActive = activation > 0;
          const dotColor = isActive
            ? colorMix(
                LENS_VAR[swatch.lens],
                "var(--ink-faint, var(--color-text-quaternary))",
                activation,
              )
            : "var(--ink-faint, var(--color-text-quaternary))";
          const labelColor = isActive
            ? colorMix(
                "var(--ink, var(--color-text-secondary))",
                "var(--ink-muted, var(--color-text-tertiary))",
                activation,
              )
            : undefined;
          const isInfrastructure = swatch.lens === "infrastructure";
          const playgroundProgress = frameProgress(
            progress,
            TAG_FRAMES[3],
            reducedMotion,
          );
          const popActive =
            isInfrastructure && playgroundProgress > 0 && playgroundProgress < 1;

          return (
            <span
              className={[
                styles.swatchAnchor,
                popActive ? styles.swatchPop : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={swatch.lens}
              ref={(node) => {
                swatchRefs.current[swatch.lens] = node;
              }}
            >
              <LensSwatch
                lens={swatch.lens}
                label={swatch.label}
                active={isActive}
                countLabel={count > 0 ? `+${count}` : undefined}
                countOpacity={activation}
                preserveLabelCase
                dotColor={dotColor}
                size={14}
                style={{ fontSize: '15px', ...(labelColor ? { color: labelColor } : {}) }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
