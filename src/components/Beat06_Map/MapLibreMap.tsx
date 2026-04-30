import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { createRoot, type Root } from "react-dom/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BlobV2, type BlobV2Weights } from "../shared/BlobV2";
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
  expandProgress: number,
) {
  const container = map.getContainer();
  const width = container.clientWidth || 960;
  const height = container.clientHeight || 480;
  const fullscreenProgress = smooth(clamp(expandProgress));
  const compact = width <= 720;
  const feedHorizontal = clamp(width * 0.13, 48, 120);
  const fullHorizontal = compact
    ? clamp(width * 0.18, 64, 76)
    : clamp(width * 0.05, 44, 72);
  const feedVertical = clamp(height * 0.16, 48, 80);
  const fullVertical = compact
    ? clamp(height * 0.08, 40, 72)
    : clamp(height * 0.06, 44, 64);
  const horizontal = Math.round(
    lerp(feedHorizontal, fullHorizontal, fullscreenProgress),
  );
  const vertical = Math.round(
    lerp(feedVertical, fullVertical, fullscreenProgress),
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
      top: vertical,
      right: horizontal,
      bottom: vertical,
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
) {
  map.resize();

  fitToMarkers(map, bounds, expandProgress);
  onMarkerPositionsChange?.(projectMarkerPositions(map, markers));
}

function markerStyle(
  marker: ParkMarker,
  markerProgress: number,
  labelsProgress: number,
): MarkerStyle {
  return {
    "--label-offset": `${Math.min(76, Math.max(18, marker.diameter * 0.42))}px`,
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
  onParkClick,
}: {
  marker: ParkMarker;
  progress: number;
  labelsProgress: number;
  reducedMotion: boolean;
  onParkClick?: (parkId: string, source?: MarkerTransitionSource) => void;
}) {
  const markerProgress = bloomProgress(progress, marker.order, reducedMotion);
  const wordCount = marker.totalWords.toLocaleString("en-US");
  const strongestLenses = topLenses(marker.weights);
  const strongestLensSummary = strongestLenses
    .map(({ lens, value }) => `${LENS_LABEL[lens]} ${formatLensShare(value)}`)
    .join(", ");

  return (
    <button
      aria-label={`${marker.name}, ${wordCount} reviewed words, strongest lenses: ${strongestLensSummary}`}
      className={styles.markerButton}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onParkClick?.(marker.id, {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }}
      style={markerStyle(marker, markerProgress, labelsProgress)}
      tabIndex={markerProgress > 0.5 ? 0 : -1}
      type="button"
    >
      <span className={styles.blobWrap}>
        <BlobV2
          ariaLabel={`${marker.name} aura`}
          paused={reducedMotion}
          seed={marker.order * 17 + 5}
          size={marker.diameter}
          weights={marker.weights}
        />
      </span>
      <span className={`${styles.markerLabel} t-body-s`}>{marker.name}</span>
      <span className={styles.tooltip} role="tooltip">
        <span className={styles.tooltipName}>{marker.name}</span>
        <span className={styles.tooltipMeta}>
          <span className={styles.tooltipCount}>{wordCount}</span>
          <span className={styles.tooltipCountLabel}>reviewed words</span>
        </span>
        <span className={styles.tooltipLensGroup}>
          <span className={styles.tooltipLensHeading}>strongest lenses</span>
          {strongestLenses.map(({ lens, value }) => (
            <span className={styles.tooltipLensRow} key={lens}>
              <span className={styles.tooltipLensName}>
                <span
                  className={styles.tooltipSwatch}
                  style={{ background: `var(${LENS_TOKEN[lens]})` }}
                  aria-hidden="true"
                />
                <span>{LENS_LABEL[lens]}</span>
              </span>
              <span className={styles.tooltipLensValue}>
                {formatLensShare(value)}
              </span>
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}

export function MapLibreMap({
  markers,
  progress,
  expandProgress,
  labelsProgress,
  reducedMotion,
  onParkClick,
  onMarkerPositionsChange,
}: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<MarkerRecord[]>([]);

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

    updateMapProjection(
      map,
      boundsRef.current,
      markersDataRef.current,
      expandProgressRef.current,
      onMarkerPositionsChangeRef.current,
    );

    map.on("load", () => {
      hideSymbolLayers(map);
      updateMapProjection(
        map,
        boundsRef.current,
        markersDataRef.current,
        expandProgressRef.current,
        onMarkerPositionsChangeRef.current,
      );
      loadFrameRef.current = requestAnimationFrame(() => {
        updateMapProjection(
          map,
          boundsRef.current,
          markersDataRef.current,
          expandProgressRef.current,
          onMarkerPositionsChangeRef.current,
        );
        settleFrameRef.current = requestAnimationFrame(() => {
          updateMapProjection(
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
        updateMapProjection(
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

    updateMapProjection(
      map,
      bounds,
      markers,
      expandProgress,
      onMarkerPositionsChange,
    );

    const frame = requestAnimationFrame(() => {
      updateMapProjection(
        map,
        bounds,
        markers,
        expandProgress,
        onMarkerPositionsChange,
      );
    });

    return () => cancelAnimationFrame(frame);
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
          labelsProgress={labelsProgress}
          marker={marker}
          onParkClick={onParkClick}
          progress={progress}
          reducedMotion={reducedMotion}
        />,
      );
      return record;
    });

    markersRef.current
      .filter((record) => !markers.some((marker) => marker.id === record.id))
      .forEach(disposeMarkerRecord);
    markersRef.current = records;
  }, [labelsProgress, markers, onParkClick, progress, reducedMotion]);

  return (
    <div className={styles.mapShell}>
      <div className={styles.mapCanvas} ref={containerRef} />
    </div>
  );
}
