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

export type MarkerScreenPosition = {
  x: number;
  y: number;
  diameter: number;
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
  const horizontal = Math.round(clamp(width * 0.13, 48, 120));
  const vertical = Math.round(clamp(height * 0.16, 48, 80));
  const overlaySpace = Math.round(clamp(width * 0.18, 0, 160) * expandProgress);

  map.fitBounds(bounds, {
    animate: false,
    padding: {
      top: vertical,
      right: horizontal,
      bottom: vertical,
      left: Math.min(Math.round(width * 0.45), horizontal + overlaySpace),
    },
    maxZoom: 13.6,
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

function dominantLens(weights: BlobV2Weights): Lens {
  return LENSES.reduce((best, lens) =>
    (weights[lens] ?? 0) > (weights[best] ?? 0) ? lens : best,
  );
}

function ParkMarkerView({
  marker,
  progress,
  labelsProgress,
  reducedMotion,
}: {
  marker: ParkMarker;
  progress: number;
  labelsProgress: number;
  reducedMotion: boolean;
}) {
  const markerProgress = bloomProgress(progress, marker.order, reducedMotion);
  const wordCount = marker.totalWords.toLocaleString("en-US");
  const dominant = dominantLens(marker.weights);

  return (
    <button
      aria-label={`${marker.name}, ${wordCount} reviewed words`}
      className={styles.markerButton}
      onClick={() => {
        console.log("Park clicked:", marker.name);
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
        <span className={styles.tooltipLens}>
          <span
            className={styles.tooltipSwatch}
            style={{ background: `var(${LENS_TOKEN[dominant]})` }}
            aria-hidden="true"
          />
          <span className={styles.tooltipLensPrefix}>dominant ·</span>
          <span>{LENS_LABEL[dominant]}</span>
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

    map.on("load", () => {
      hideSymbolLayers(map);
      fitToMarkers(map, bounds, 0);
      onMarkerPositionsChange?.(projectMarkerPositions(map, markers));
    });

    return () => {
      markersRef.current.forEach(({ marker, root }) => {
        root.unmount();
        marker.remove();
      });
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [bounds, markers, onMarkerPositionsChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const frame = requestAnimationFrame(() => {
      map.resize();
      if (map.loaded()) {
        fitToMarkers(map, bounds, expandProgress);
        onMarkerPositionsChange?.(projectMarkerPositions(map, markers));
      }
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
          progress={progress}
          reducedMotion={reducedMotion}
        />,
      );
      return record;
    });

    markersRef.current
      .filter((record) => !markers.some((marker) => marker.id === record.id))
      .forEach((record) => {
        record.root.unmount();
        record.marker.remove();
      });
    markersRef.current = records;
  }, [labelsProgress, markers, progress, reducedMotion]);

  return (
    <div className={styles.mapShell}>
      <div className={styles.mapCanvas} ref={containerRef} />
    </div>
  );
}
