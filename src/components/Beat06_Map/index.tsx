import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { CATEGORY_TO_LENS, LENSES } from "../shared/LensSwatch";
import { useScrollProgressValue } from "../shared/ScrollSection";
import type { BlobV2Weights } from "../shared/BlobV2";
import {
  MapLibreMap,
  type MarkerScreenPosition,
  type MarkerTransitionSource,
} from "./MapLibreMap";
import { getParkMapFeatures } from "./parkMapData";
import styles from "./Beat06Map.module.css";

const MAX_DIAMETER = 180;
const MIN_DIAMETER = 32;
const ONBOARDING_REVEAL_THRESHOLD = 0.7;

// Module-level so the dismissal survives Beat06Map remounts within a single
// page load (e.g. round-trips through ParkView), but resets on reload.
let onboardingDismissedThisLoad = false;

type ViewportSize = {
  width: number;
  height: number;
};

type MapFrameStyle = CSSProperties & {
  "--map-radius": string;
  "--map-scrim-opacity": string;
};

type OnboardingStep = {
  step: string;
  title: string;
  body: string;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    step: "Step 1 of 3",
    title: "Each blob is a park.",
    body:
      "Bigger means more reviewed words. Colours show what kind of language the reviews contain.",
  },
  {
    step: "Step 2 of 3",
    title: "Colors show proportions.",
    body:
      "The more a color dominates, the more that dimension shapes the park's identity.",
  },
  {
    step: "Step 3 of 3",
    title: "Click any park.",
    body: "Step inside its words and see what people actually wrote.",
  },
];

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function clampPx(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function rangeProgress(progress: number, start: number, end: number): number {
  return clamp((progress - start) / (end - start));
}

function smooth(value: number): number {
  return value * value * (3 - 2 * value);
}

function fadeProgress(
  progress: number,
  start: number,
  end: number,
  reducedMotion: boolean,
): number {
  return reducedMotion ? 1 : smooth(rangeProgress(progress, start, end));
}

function fadeStyle(value: number, distance = 16): CSSProperties {
  return {
    opacity: value,
    transform: `translateY(${distance * (1 - value)}px)`,
  };
}

function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  }));

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}

function mapFrameStyle(
  viewport: ViewportSize,
  expandProgress: number,
  mapProgress: number,
  textProgress: number,
): MapFrameStyle {
  const isCompact = viewport.width <= 720;
  const gutter = isCompact ? 24 : 32;
  const initialWidth = Math.min(960, viewport.width - gutter);
  const initialHeight = isCompact
    ? clampPx(viewport.height * 0.46, 300, 420)
    : clampPx(viewport.height * 0.48, 320, 480);

  return {
    width: `${lerp(initialWidth, viewport.width, expandProgress)}px`,
    height: `${lerp(initialHeight, viewport.height, expandProgress)}px`,
    opacity: mapProgress,
    "--map-radius": `${lerp(12, 0, expandProgress)}px`,
    "--map-scrim-opacity": (0.36 * textProgress).toFixed(3),
  };
}

function toBlobWeights(categoryWeights: Record<string, number>): BlobV2Weights {
  const weights = {} as BlobV2Weights;
  LENSES.forEach((lens) => {
    weights[lens] = 0;
  });

  Object.entries(categoryWeights).forEach(([category, value]) => {
    const lens = CATEGORY_TO_LENS[category];
    if (lens) weights[lens] = value;
  });

  return weights;
}

function readOnboardingDismissed(): boolean {
  return onboardingDismissedThisLoad;
}

function persistOnboardingDismissed() {
  onboardingDismissedThisLoad = true;
}

type Beat06MapProps = {
  onCompareClick?: () => void;
  onFeedbackClick?: () => void;
  onParkClick?: (parkId: string, source?: MarkerTransitionSource) => void;
  onMarkerPositionsChange?: (
    positions: Record<string, MarkerScreenPosition>,
  ) => void;
};

export function Beat06Map({
  onCompareClick,
  onFeedbackClick,
  onMarkerPositionsChange,
  onParkClick,
}: Beat06MapProps) {
  const progress = useScrollProgressValue();
  const reducedMotion = useReducedMotion();
  const viewport = useViewportSize();
  const mapFrameRef = useRef<HTMLDivElement | null>(null);

  const [onboardingDismissed, setOnboardingDismissed] = useState(
    readOnboardingDismissed,
  );
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingRevealed, setOnboardingRevealed] = useState(false);

  const handleMarkerPositionsChange = useCallback(
    (positions: Record<string, MarkerScreenPosition>) => {
      const frameRect = mapFrameRef.current?.getBoundingClientRect();
      const viewportPositions = frameRect
        ? Object.fromEntries(
            Object.entries(positions).map(([parkId, position]) => [
              parkId,
              {
                ...position,
                x: position.x + frameRect.left,
                y: position.y + frameRect.top,
              },
            ]),
          )
        : positions;

      onMarkerPositionsChange?.(viewportPositions);
    },
    [onMarkerPositionsChange],
  );

  const markers = useMemo(() => {
    const features = getParkMapFeatures();
    const maxTotalWords = Math.max(...features.map((park) => park.totalWords));
    const orderBySize = new Map(
      [...features]
        .sort((a, b) => b.totalWords - a.totalWords)
        .map((park, index) => [park.id, index]),
    );

    return features.map((park) => ({
      ...park,
      diameter: Math.max(
        MIN_DIAMETER,
        MAX_DIAMETER * Math.sqrt(park.totalWords / maxTotalWords),
      ),
      order: orderBySize.get(park.id) ?? 0,
      weights: toBlobWeights(park.categoryWeights),
    }));
  }, []);

  const mapProgress = fadeProgress(progress, 0, 0.12, reducedMotion);
  const expandProgress = fadeProgress(progress, 0.14, 0.34, reducedMotion);
  const introProgress = fadeProgress(progress, 0.38, 0.48, reducedMotion);
  const labelsProgress = fadeProgress(progress, 0.7, 0.8, reducedMotion);
  const textProgress = introProgress;

  const onboardingActive =
    !onboardingDismissed &&
    (onboardingRevealed || progress >= ONBOARDING_REVEAL_THRESHOLD);

  useEffect(() => {
    if (!onboardingDismissed && progress >= ONBOARDING_REVEAL_THRESHOLD) {
      setOnboardingRevealed(true);
    }
  }, [onboardingDismissed, progress]);

  const dismissOnboarding = useCallback(() => {
    persistOnboardingDismissed();
    setOnboardingDismissed(true);
  }, []);

  const handleOnboardingNext = useCallback(() => {
    setOnboardingStep((current) => {
      if (current >= ONBOARDING_STEPS.length - 1) {
        dismissOnboarding();
        return current;
      }
      return current + 1;
    });
  }, [dismissOnboarding]);

  const handleOnboardingBack = useCallback(() => {
    setOnboardingStep((current) => Math.max(0, current - 1));
  }, []);

  const currentOnboardingStep = ONBOARDING_STEPS[onboardingStep];
  const isLastOnboardingStep = onboardingStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className={styles.stage}>
      <div
        className={styles.mapFrame}
        ref={mapFrameRef}
        style={mapFrameStyle(
          viewport,
          expandProgress,
          mapProgress,
          textProgress,
        )}
      >
        <MapLibreMap
          expandProgress={expandProgress}
          labelsProgress={labelsProgress}
          markers={markers}
          onParkClick={onParkClick}
          onMarkerPositionsChange={handleMarkerPositionsChange}
          progress={progress}
          reducedMotion={reducedMotion}
        />

        <div className={styles.mapActions}>
          <button
            className="btn-primary"
            onClick={onFeedbackClick}
            type="button"
          >
            Tell us how you feel
          </button>
          <button
            className="btn-primary"
            onClick={onCompareClick}
            type="button"
          >
            Compare all five
          </button>
        </div>

        <header className={styles.mapHeader} style={fadeStyle(introProgress)}>
          <h1 className="t-display-m">An Aura of Words</h1>
          <p className="t-body-s">Green Spaces of Lugano</p>
        </header>

        {onboardingActive ? (
          <aside
            aria-live="polite"
            className={styles.onboarding}
            role="dialog"
            aria-labelledby="beat06-onboarding-title"
          >
            <span className={styles.onboardingStep}>
              {currentOnboardingStep.step}
            </span>
            <h4
              className={`${styles.onboardingTitle} t-display-s`}
              id="beat06-onboarding-title"
            >
              {currentOnboardingStep.title}
            </h4>
            <p className={`${styles.onboardingBody} t-body-s`}>
              {currentOnboardingStep.body}
            </p>
            <div className={styles.onboardingDots} aria-hidden="true">
              {ONBOARDING_STEPS.map((_, index) => (
                <span
                  className={`${styles.onboardingDot} ${
                    index === onboardingStep ? styles.onboardingDotActive : ""
                  }`}
                  key={index}
                />
              ))}
            </div>
            <div className={styles.onboardingActions}>
              <button
                className={styles.onboardingSkip}
                onClick={dismissOnboarding}
                type="button"
              >
                Skip
              </button>
              <div className={styles.onboardingNav}>
                {onboardingStep > 0 ? (
                  <button
                    className={styles.onboardingBack}
                    onClick={handleOnboardingBack}
                    type="button"
                  >
                    Back
                  </button>
                ) : null}
                <button
                  className={`${styles.onboardingNext} btn-primary`}
                  onClick={handleOnboardingNext}
                  type="button"
                >
                  {isLastOnboardingStep ? "Got it" : "Next"}
                </button>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
