import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
} from "./MapLibreMap";
import { getParkMapFeatures } from "./parkMapData";
import styles from "./Beat06Map.module.css";

const MAX_DIAMETER = 180;
const MIN_DIAMETER = 32;

type ViewportSize = {
  width: number;
  height: number;
};

type MapFrameStyle = CSSProperties & {
  "--map-radius": string;
  "--map-scrim-opacity": string;
};

type Point = {
  x: number;
  y: number;
};

type CalloutAnchors = {
  read?: Point;
  imbalance?: Point;
  click?: Point;
};

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

function arrowStyle(value: number): CSSProperties {
  return {
    opacity: value,
  };
}

function markerPoint(
  positions: Record<string, MarkerScreenPosition>,
  id: string,
  fallback: Point,
): Point {
  const position = positions[id];
  if (!position) return fallback;

  return {
    x: position.x,
    y: position.y,
  };
}

function curvedPath(from: Point, to: Point): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const control = {
    x: from.x + dx * 0.58 - dy * 0.12,
    y: from.y + dy * 0.52 + dx * 0.08,
  };

  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${control.x.toFixed(
    1,
  )} ${control.y.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
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

export function Beat06Map() {
  const progress = useScrollProgressValue();
  const reducedMotion = useReducedMotion();
  const viewport = useViewportSize();
  const mapFrameRef = useRef<HTMLDivElement | null>(null);
  const readCalloutRef = useRef<HTMLElement | null>(null);
  const imbalanceCalloutRef = useRef<HTMLElement | null>(null);
  const clickCalloutRef = useRef<HTMLElement | null>(null);
  const [markerPositions, setMarkerPositions] = useState<
    Record<string, MarkerScreenPosition>
  >({});
  const [calloutAnchors, setCalloutAnchors] = useState<CalloutAnchors>({});

  const handleMarkerPositionsChange = useCallback(
    (positions: Record<string, MarkerScreenPosition>) => {
      setMarkerPositions(positions);
    },
    [],
  );

  const measureCalloutAnchors = useCallback(() => {
    const frame = mapFrameRef.current;
    if (!frame) return;

    const frameRect = frame.getBoundingClientRect();
    const pointFromElement = (
      element: HTMLElement | null,
      side: "left" | "right" | "top",
    ): Point | undefined => {
      if (!element) return undefined;
      const rect = element.getBoundingClientRect();

      if (side === "top") {
        return {
          x: rect.left - frameRect.left + rect.width * 0.5,
          y: rect.top - frameRect.top,
        };
      }

      return {
        x:
          side === "left"
            ? rect.left - frameRect.left
            : rect.right - frameRect.left,
        y: rect.top - frameRect.top + rect.height * 0.5,
      };
    };

    const next = {
      read: pointFromElement(readCalloutRef.current, "left"),
      imbalance: pointFromElement(imbalanceCalloutRef.current, "top"),
      click: pointFromElement(clickCalloutRef.current, "left"),
    };

    setCalloutAnchors((previous) => {
      const samePoint = (a?: Point, b?: Point) =>
        (!a && !b) ||
        (Boolean(a) &&
          Boolean(b) &&
          Math.abs((a?.x ?? 0) - (b?.x ?? 0)) < 0.5 &&
          Math.abs((a?.y ?? 0) - (b?.y ?? 0)) < 0.5);

      return samePoint(previous.read, next.read) &&
        samePoint(previous.imbalance, next.imbalance) &&
        samePoint(previous.click, next.click)
        ? previous
        : next;
    });
  }, []);

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
  const readProgress = fadeProgress(progress, 0.68, 0.78, reducedMotion);
  const imbalanceProgress = fadeProgress(progress, 0.76, 0.86, reducedMotion);
  const clickProgress = fadeProgress(progress, 0.86, 0.96, reducedMotion);
  const textProgress = Math.max(
    introProgress,
    readProgress,
    imbalanceProgress,
    clickProgress,
  );
  const paradisoPoint = markerPoint(markerPositions, "paradiso", {
    x: viewport.width * 0.56,
    y: viewport.height * 0.66,
  });
  const sanMichelePoint = markerPoint(markerPositions, "san-michele", {
    x: viewport.width * 0.68,
    y: viewport.height * 0.42,
  });
  const tassinoPoint = markerPoint(markerPositions, "tassino", {
    x: viewport.width * 0.36,
    y: viewport.height * 0.58,
  });

  useLayoutEffect(() => {
    measureCalloutAnchors();
  }, [
    clickProgress,
    expandProgress,
    imbalanceProgress,
    measureCalloutAnchors,
    readProgress,
    viewport,
  ]);

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
          onMarkerPositionsChange={handleMarkerPositionsChange}
          progress={progress}
          reducedMotion={reducedMotion}
        />

        <svg className={styles.annotationArrows} aria-hidden="true">
          <defs>
            <marker
              id="beat06-arrowhead"
              markerHeight="6"
              markerWidth="6"
              orient="auto"
              refX="3"
              refY="3"
              viewBox="0 0 6 6"
            >
              <circle cx="3" cy="3" r="2.5" />
            </marker>
          </defs>
          <path
            d={curvedPath(
              calloutAnchors.read ?? {
                x: viewport.width * 0.72,
                y: viewport.height * 0.27,
              },
              sanMichelePoint,
            )}
            style={arrowStyle(readProgress)}
          />
          <path
            d={curvedPath(
              calloutAnchors.imbalance ?? {
                x: viewport.width * 0.25,
                y: viewport.height * 0.72,
              },
              tassinoPoint,
            )}
            style={arrowStyle(imbalanceProgress)}
          />
          <path
            d={curvedPath(
              calloutAnchors.click ?? {
                x: viewport.width * 0.72,
                y: viewport.height * 0.78,
              },
              paradisoPoint,
            )}
            style={arrowStyle(clickProgress)}
          />
        </svg>

        <header className={styles.mapHeader} style={fadeStyle(introProgress)}>
          <h1 className="t-display-m">Perception Park Map</h1>
        </header>

        <aside
          className={`${styles.callout} ${styles.readAnnotation}`}
          ref={readCalloutRef}
          style={fadeStyle(readProgress, 10)}
        >
          <span className={styles.calloutStep}>Step 1 of 3</span>
          <h4 className={`${styles.calloutTitle} t-display-s`}>
            Each blob is a park.
          </h4>
          <p className={`${styles.calloutBody} t-body-s`}>
            Bigger means more reviewed words. Colours show what kind of language
            the reviews contain.
          </p>
        </aside>

        <aside
          className={`${styles.callout} ${styles.imbalanceAnnotation}`}
          ref={imbalanceCalloutRef}
          style={fadeStyle(imbalanceProgress, 10)}
        >
          <span className={styles.calloutStep}>Step 2 of 3</span>
          <h4 className={`${styles.calloutTitle} t-display-s`}>
            Colors show proportions.
          </h4>
          <p className={`${styles.calloutBody} t-body-s`}>
            The more a color dominates, the more that dimension shapes the park's identity.
          </p>
        </aside>

        <aside
          className={`${styles.callout} ${styles.clickAnnotation}`}
          ref={clickCalloutRef}
          style={fadeStyle(clickProgress, 10)}
        >
          <span className={styles.calloutStep}>Step 3 of 3</span>
          <h4 className={`${styles.calloutTitle} t-display-s`}>
            Click any park.
          </h4>
          <p className={`${styles.calloutBody} t-body-s`}>
            Step inside its words and see what people actually wrote.
          </p>
        </aside>
      </div>
    </div>
  );
}
