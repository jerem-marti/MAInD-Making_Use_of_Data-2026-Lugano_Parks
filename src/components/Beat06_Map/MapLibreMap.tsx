import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createRoot, type Root } from "react-dom/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BlobV2, spotOffsets, type BlobV2Weights } from "../shared/BlobV2";
import { LENSES, LENS_TOKEN, type Lens } from "../shared/LensSwatch";
import type { ParkMapFeature } from "./parkMapData";
import styles from "./Beat06Map.module.css";

type ParkMarker = ParkMapFeature & {
  diameter: number;
  order: number;
  weights: BlobV2Weights;
};

type MarkerRecord = {
  id: string;
  marker: maplibregl.Marker;
  root: Root;
};

function disposeMarkerRecord({ marker, root }: MarkerRecord) {
  marker.remove();
  window.setTimeout(() => root.unmount(), 0);
}

export type MarkerScreenPosition = {
  x: number;
  y: number;
  diameter: number;
};

export type MarkerTransitionSource = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type MarkerStyle = CSSProperties & {
  "--label-offset": string;
  "--marker-size": string;
  "--marker-scale": string;
  "--label-opacity": string;
};

type MapLibreMapProps = {
  markers: ParkMarker[];
  progress: number;
  expandProgress: number;
  labelsProgress: number;
  reducedMotion: boolean;
  wordCountVisible: boolean;
  onParkClick?: (parkId: string, source?: MarkerTransitionSource) => void;
  onMarkerPositionsChange?: (
    positions: Record<string, MarkerScreenPosition>,
  ) => void;
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function rangeProgress(progress: number, start: number, end: number): number {
  return clamp((progress - start) / (end - start));
}

function smooth(value: number): number {
  return value * value * (3 - 2 * value);
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function bloomProgress(
  progress: number,
  order: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 1;
  const start = 0.52 + order * 0.045;
  return smooth(rangeProgress(progress, start, start + 0.07));
}

function fitToMarkers(
  map: maplibregl.Map,
  bounds: maplibregl.LngLatBounds,
  markers: ParkMarker[],
  expandProgress: number,
) {
  const container = map.getContainer();
  const width = container.clientWidth || 960;
  const height = container.clientHeight || 480;
  const fullscreenProgress = smooth(clamp(expandProgress));
  const compact = width <= 720;

  // The label sits below the marker center by `--label-offset`, which matches
  // the value computed in markerStyle. Reserve enough bottom padding so the
  // largest marker's halo + label stay clear of the screen edge.
  const maxDiameter = markers.reduce(
    (max, marker) => Math.max(max, marker.diameter),
    0,
  );
  const maxRadius = maxDiameter / 2;
  const maxLabelOffset = Math.min(124, Math.max(22, maxDiameter * 0.72));
  const labelClearance = Math.ceil(maxLabelOffset + 14); // label height + breathing
  const markerHaloBottom = Math.ceil(
    Math.max(maxRadius, labelClearance) + 18,
  );
  const markerHaloTop = Math.ceil(maxRadius + 14);

  const feedHorizontal = clamp(width * 0.13, 48, 120);
  const fullHorizontal = compact
    ? clamp(width * 0.18, 64, 76)
    : clamp(width * 0.05, 44, 72);
  const feedVertical = clamp(height * 0.16, 48, 80);
  const fullVerticalBottom = compact
    ? Math.max(markerHaloBottom, clamp(height * 0.14, 96, 140))
    : Math.max(markerHaloBottom, clamp(height * 0.10, 100, 132));
  const fullVerticalTop = compact
    ? Math.max(markerHaloTop, clamp(height * 0.08, 56, 96))
    : Math.max(markerHaloTop, clamp(height * 0.06, 60, 96));
  const horizontal = Math.round(
    lerp(feedHorizontal, fullHorizontal, fullscreenProgress),
  );
  const verticalTop = Math.round(
    lerp(feedVertical, fullVerticalTop, fullscreenProgress),
  );
  const verticalBottom = Math.round(
    lerp(feedVertical, fullVerticalBottom, fullscreenProgress),
  );
  const overlaySpace = compact
    ? 0
    : Math.round(
        lerp(0, clamp(width * 0.08, 0, 72), fullscreenProgress),
      );
  const maxZoom = lerp(
    13.6,
    compact ? 13.85 : height <= 760 ? 14.25 : 14.45,
    fullscreenProgress,
  );

  map.fitBounds(bounds, {
    animate: false,
    padding: {
      top: verticalTop,
      right: horizontal,
      bottom: verticalBottom,
      left: Math.min(Math.round(width * 0.45), horizontal + overlaySpace),
    },
    maxZoom,
  });
}

function hideSymbolLayers(map: maplibregl.Map) {
  map.getStyle().layers?.forEach((layer) => {
    if (layer.type === "symbol") {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  });
}

function projectMarkerPositions(
  map: maplibregl.Map,
  markers: ParkMarker[],
): Record<string, MarkerScreenPosition> {
  return Object.fromEntries(
    markers.map((marker) => {
      const point = map.project(marker.coordinates);
      return [
        marker.id,
        {
          x: point.x,
          y: point.y,
          diameter: marker.diameter,
        },
      ];
    }),
  );
}

function updateMapProjection(
  map: maplibregl.Map,
  bounds: maplibregl.LngLatBounds,
  markers: ParkMarker[],
  expandProgress: number,
  onMarkerPositionsChange?: (
    positions: Record<string, MarkerScreenPosition>,
  ) => void,
): Record<string, MarkerScreenPosition> {
  map.resize();

  fitToMarkers(map, bounds, markers, expandProgress);
  const positions = projectMarkerPositions(map, markers);
  onMarkerPositionsChange?.(positions);
  return positions;
}

function markerStyle(
  marker: ParkMarker,
  markerProgress: number,
  labelsProgress: number,
): MarkerStyle {
  return {
    "--label-offset": `${Math.min(124, Math.max(22, marker.diameter * 0.72))}px`,
    "--marker-size": `${marker.diameter}px`,
    "--marker-scale": markerProgress.toFixed(3),
    "--label-opacity": labelsProgress.toFixed(3),
  };
}

const LENS_LABEL: Record<Lens, string> = {
  emotional: "emotional",
  sensory: "sensory",
  action: "action",
  relational: "relational",
  infrastructure: "infrastructure",
  tension: "tension",
};

function lensWordCounts(weights: BlobV2Weights, totalWords: number): Record<Lens, number> {
  const raw = LENSES.map((lens) => Math.max(0, weights[lens] ?? 0));
  const total = raw.reduce((s, v) => s + v, 0) || 1;
  return Object.fromEntries(
    LENSES.map((lens, i) => [lens, Math.round((raw[i] / total) * totalWords)])
  ) as Record<Lens, number>;
}

// Per-lens radial distance from blob center as % of blob size — all > 50 so
// labels sit just outside the blob circle (blob radius = 50% of container).
// Varied values give an organic spread; connector lines bridge each number back
// to its colour spot (which lives at radius 35, the BlobV2 spot anchor).
// Order matches LENSES: emotional, sensory, action, relational, infrastructure, tension.
const BASE_LABEL_RADII = [56, 64, 53, 67, 58, 62];

// Approx half-width of a 4-digit count label and breathing room beyond a
// neighbour's blob edge before we hide a label that points at it.
const LABEL_HALF_WIDTH = 18;
const LABEL_GAP = 6;
const EMPTY_HIDDEN: readonly boolean[] = [false, false, false, false, false, false];

function neighborReachPx(diameter: number): number {
  const maxRadiusPct = Math.max(...BASE_LABEL_RADII) / 100;
  return diameter * maxRadiusPct + LABEL_HALF_WIDTH + LABEL_GAP;
}

function computeHiddenLabels(
  positions: Record<string, MarkerScreenPosition>,
  markers: ParkMarker[],
): Record<string, boolean[]> {
  const result: Record<string, boolean[]> = {};
  for (const a of markers) {
    const pa = positions[a.id];
    const hidden: boolean[] = [false, false, false, false, false, false];
    if (!pa) {
      result[a.id] = hidden;
      continue;
    }
    const seedA = a.order * 17 + 5;
    const offsetsA = spotOffsets(seedA);

    for (let i = 0; i < 6; i++) {
      const radiusFactor = (BASE_LABEL_RADII[i] / 35) * (a.diameter / 100);
      const lx = pa.x + offsetsA[i].x * radiusFactor;
      const ly = pa.y + offsetsA[i].y * radiusFactor;

      for (const b of markers) {
        if (b.id === a.id) continue;
        const pb = positions[b.id];
        if (!pb) continue;
        if (Math.hypot(lx - pb.x, ly - pb.y) < neighborReachPx(b.diameter)) {
          hidden[i] = true;
          break;
        }
      }
    }
    result[a.id] = hidden;
  }
  return result;
}

function sameHiddenMap(
  a: Record<string, boolean[]>,
  b: Record<string, boolean[]>,
): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => {
    const av = a[k];
    const bv = b[k];
    if (!bv || av.length !== bv.length) return false;
    return av.every((v, i) => v === bv[i]);
  });
}

function topLenses(weights: BlobV2Weights, count = 2) {
  return LENSES.map((lens) => ({
    lens,
    value: weights[lens] ?? 0,
  }))
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}

function formatLensShare(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function ParkMarkerView({
  marker,
  progress,
  labelsProgress,
  reducedMotion,
  wordCountVisible,
  hiddenLabels,
  onParkClick,
}: {
  marker: ParkMarker;
  progress: number;
  labelsProgress: number;
  reducedMotion: boolean;
  wordCountVisible: boolean;
  hiddenLabels: readonly boolean[];
  onParkClick?: (parkId: string, source?: MarkerTransitionSource) => void;
}) {
  const markerProgress = bloomProgress(progress, marker.order, reducedMotion);
  const wordCount = marker.totalWords.toLocaleString("en-US");
  const strongestLenses = topLenses(marker.weights);
  const strongestLensSummary = strongestLenses
    .map(({ lens, value }) => `${LENS_LABEL[lens]} ${formatLensShare(value)}`)
    .join(", ");
  const seed = marker.order * 17 + 5;
  const offsets = spotOffsets(seed);
  const counts = lensWordCounts(marker.weights, marker.totalWords);
  const labelAbove = marker.id === "lambertenghi";
  const [revealAll, setRevealAll] = useState(false);

  return (
    <button
      aria-label={`${marker.name}, ${wordCount} reviewed words, strongest lenses: ${strongestLensSummary}`}
      className={styles.markerButton}
      onBlur={() => setRevealAll(false)}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onParkClick?.(marker.id, {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }}
      onFocus={() => setRevealAll(true)}
      onPointerEnter={() => setRevealAll(true)}
      onPointerLeave={() => setRevealAll(false)}
      style={markerStyle(marker, markerProgress, labelsProgress)}
      tabIndex={markerProgress > 0.5 ? 0 : -1}
      type="button"
    >
      <span className={styles.blobWrap}>
        <BlobV2
          ariaLabel={`${marker.name} aura`}
          paused={reducedMotion}
          seed={seed}
          size={marker.diameter}
          weights={marker.weights}
        />
        <span
          className={`${styles.blobCounts}${wordCountVisible ? ` ${styles.blobCountsVisible}` : ""}`}
          aria-hidden="true"
        >
          {/* SVG connector lines + dots, one per lens */}
          <svg
            className={styles.blobConnectors}
            viewBox="0 0 100 100"
            overflow="visible"
            aria-hidden="true"
          >
            {LENSES.map((lens, i) => {
              const count = counts[lens];
              if (!count) return null;
              const visible = revealAll || !hiddenLabels[i];
              // Inner end: BlobV2 colour-spot anchor (radius 35 in viewBox units)
              const ix = 50 + offsets[i].x;
              const iy = 50 + offsets[i].y;
              // Outer end: 3 units short of the number centre
              const outerR = BASE_LABEL_RADII[i] - 3;
              const ox = 50 + offsets[i].x * (outerR / 35);
              const oy = 50 + offsets[i].y * (outerR / 35);
              return (
                <path
                  className={styles.blobConnectorPath}
                  key={lens}
                  d={`M ${ix.toFixed(2)} ${iy.toFixed(2)} L ${ox.toFixed(2)} ${oy.toFixed(2)}`}
                  stroke={`var(${LENS_TOKEN[lens]})`}
                  strokeWidth="0.8"
                  fill="none"
                  opacity={visible ? 0.7 : 0}
                />
              );
            })}
          </svg>

          {/* Per-lens word counts, positioned just outside the blob edge */}
          {LENSES.map((lens, i) => {
            const count = counts[lens];
            if (!count) return null;
            const visible = revealAll || !hiddenLabels[i];
            const scale = BASE_LABEL_RADII[i] / 35;
            return (
              <span
                key={lens}
                className={styles.blobCountLabel}
                style={{
                  left: `${50 + offsets[i].x * scale}%`,
                  top: `${50 + offsets[i].y * scale}%`,
                  opacity: visible ? 1 : 0,
                }}
              >
                {count}
              </span>
            );
          })}
        </span>
      </span>
      <span className={`${styles.markerLabel}${labelAbove ? ` ${styles.markerLabelAbove}` : ""}`}>{marker.name}</span>
    </button>
  );
}

export function MapLibreMap({
  markers,
  progress,
  expandProgress,
  labelsProgress,
  reducedMotion,
  wordCountVisible,
  onParkClick,
  onMarkerPositionsChange,
}: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<MarkerRecord[]>([]);
  const [hiddenLabelsById, setHiddenLabelsById] = useState<
    Record<string, boolean[]>
  >({});

  const bounds = useMemo(() => {
    const next = new maplibregl.LngLatBounds();
    markers.forEach((marker) => next.extend(marker.coordinates));
    return next;
  }, [markers]);

  const boundsRef = useRef(bounds);
  const expandProgressRef = useRef(expandProgress);
  const markersDataRef = useRef(markers);
  const onMarkerPositionsChangeRef = useRef(onMarkerPositionsChange);
  const loadFrameRef = useRef<number | null>(null);
  const settleFrameRef = useRef<number | null>(null);
  const resizeFrameRef = useRef<number | null>(null);

  boundsRef.current = bounds;
  expandProgressRef.current = expandProgress;
  markersDataRef.current = markers;
  onMarkerPositionsChangeRef.current = onMarkerPositionsChange;

  const refreshProjection = (
    map: maplibregl.Map,
    boundsArg: maplibregl.LngLatBounds,
    markersArg: ParkMarker[],
    expandProgressArg: number,
    onPositionsChange:
      | ((positions: Record<string, MarkerScreenPosition>) => void)
      | undefined,
  ) => {
    const positions = updateMapProjection(
      map,
      boundsArg,
      markersArg,
      expandProgressArg,
      onPositionsChange,
    );
    const next = computeHiddenLabels(positions, markersArg);
    setHiddenLabelsById((prev) => (sameHiddenMap(prev, next) ? prev : next));
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [8.956, 46.003],
      zoom: 12.7,
      attributionControl: { compact: true },
      interactive: true,
    });
    mapRef.current = map;

    map.scrollZoom.disable();
    map.boxZoom.disable();
    map.dragPan.disable();
    map.dragRotate.disable();
    map.keyboard.disable();
    map.touchZoomRotate.disable();
    map.doubleClickZoom.disable();
    map.getCanvas().tabIndex = -1;

    refreshProjection(
      map,
      boundsRef.current,
      markersDataRef.current,
      expandProgressRef.current,
      onMarkerPositionsChangeRef.current,
    );

    map.on("load", () => {
      hideSymbolLayers(map);
      refreshProjection(
        map,
        boundsRef.current,
        markersDataRef.current,
        expandProgressRef.current,
        onMarkerPositionsChangeRef.current,
      );
      loadFrameRef.current = requestAnimationFrame(() => {
        refreshProjection(
          map,
          boundsRef.current,
          markersDataRef.current,
          expandProgressRef.current,
          onMarkerPositionsChangeRef.current,
        );
        settleFrameRef.current = requestAnimationFrame(() => {
          refreshProjection(
            map,
            boundsRef.current,
            markersDataRef.current,
            expandProgressRef.current,
            onMarkerPositionsChangeRef.current,
          );
        });
      });
    });

    const resizeObserver = new ResizeObserver(() => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }

      resizeFrameRef.current = requestAnimationFrame(() => {
        refreshProjection(
          map,
          boundsRef.current,
          markersDataRef.current,
          expandProgressRef.current,
          onMarkerPositionsChangeRef.current,
        );
      });
    });
    resizeObserver.observe(container);

    return () => {
      if (loadFrameRef.current !== null) {
        cancelAnimationFrame(loadFrameRef.current);
      }
      if (settleFrameRef.current !== null) {
        cancelAnimationFrame(settleFrameRef.current);
      }
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      resizeObserver.disconnect();
      markersRef.current.forEach(disposeMarkerRecord);
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    refreshProjection(
      map,
      bounds,
      markers,
      expandProgress,
      onMarkerPositionsChange,
    );

    const frame = requestAnimationFrame(() => {
      refreshProjection(
        map,
        bounds,
        markers,
        expandProgress,
        onMarkerPositionsChange,
      );
    });

    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, expandProgress, markers, onMarkerPositionsChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const records = markers.map((marker) => {
      let record = markersRef.current.find((item) => item.id === marker.id);
      if (!record) {
        const element = document.createElement("div");
        element.className = styles.markerRoot;
        element.style.width = `${marker.diameter}px`;
        element.style.height = `${marker.diameter}px`;
        const root = createRoot(element);
        const mapMarker = new maplibregl.Marker({
          anchor: "center",
          element,
        })
          .setLngLat(marker.coordinates)
          .addTo(map);
        record = { id: marker.id, marker: mapMarker, root };
      }

      const element = record.marker.getElement();
      element.style.width = `${marker.diameter}px`;
      element.style.height = `${marker.diameter}px`;
      element.style.zIndex = `${20 + marker.order}`;
      record.marker.setLngLat(marker.coordinates);
      record.root.render(
        <ParkMarkerView
          hiddenLabels={hiddenLabelsById[marker.id] ?? EMPTY_HIDDEN}
          labelsProgress={labelsProgress}
          marker={marker}
          onParkClick={onParkClick}
          progress={progress}
          reducedMotion={reducedMotion}
          wordCountVisible={wordCountVisible}
        />,
      );
      return record;
    });

    markersRef.current
      .filter((record) => !markers.some((marker) => marker.id === record.id))
      .forEach(disposeMarkerRecord);
    markersRef.current = records;
  }, [
    hiddenLabelsById,
    labelsProgress,
    markers,
    onParkClick,
    progress,
    reducedMotion,
    wordCountVisible,
  ]);

  return (
    <div className={styles.mapShell}>
      <div className={styles.mapCanvas} ref={containerRef} />
    </div>
  );
}
