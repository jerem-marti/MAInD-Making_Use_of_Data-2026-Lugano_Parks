import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import parksData from "../data/parks.json";
import {
  CATEGORY_TOKENS,
  type Category,
  type Edge,
  type Node,
  type WordNetworkNode,
} from "../data/types";
import { Blob, type BlobWeights } from "../components/shared/Blob";
import {
  CATEGORY_TO_LENS,
  LENSES,
  type Lens,
} from "../components/shared/LensSwatch";
import { runLayout } from "../network/layout";
import "./ActIIChoreography.css";

export type ChoreographyRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ActIIChoreographyMode = "to-park" | "to-map";

type ParkForChoreography = {
  id: string;
  name: string;
  categoryWeights: Record<Category, number>;
  wordNetwork: {
    nodes: WordNetworkNode[];
    edges: Edge[];
  };
};

type TargetWord = {
  id: string;
  term: string;
  category: Category;
  frequency: number;
  fontSize: number;
  x: number;
  y: number;
  particleSize: number;
  startX: number;
  startY: number;
};

type Viewport = {
  width: number;
  height: number;
};

const PARTICLE_LIMIT = 100;
const FALLBACK_HEADER_HEIGHT = 180;
const DETAILS_HEIGHT = 72;
const DETAILS_HEIGHT_MOBILE = 92;
const LEGEND_HEIGHT = 80;
const LEGEND_HEIGHT_MOBILE = 116;
const DESKTOP_PADDING_X = 56;
const DESKTOP_PADDING_Y = 44;
const MOBILE_PADDING_X = 28;
const MOBILE_PADDING_Y = 28;
const PARK_CENTER_BLOB_SIZE = 320;
const MAP_CENTER_BLOB_SIZE = 230;

function lensColour(category: Category): string {
  return `var(${CATEGORY_TOKENS[category]})`;
}

function findPark(parkId: string): ParkForChoreography {
  const parks = parksData.parks as ParkForChoreography[];
  return parks.find((park) => park.id === parkId) ?? parks[0];
}

function emptyBlobWeights(): BlobWeights {
  return LENSES.reduce((weights, lens) => {
    weights[lens] = 0;
    return weights;
  }, {} as BlobWeights);
}

function weightsForBlob(categoryWeights: Record<Category, number>): BlobWeights {
  const weights = emptyBlobWeights();
  Object.entries(categoryWeights).forEach(([category, value]) => {
    const lens = CATEGORY_TO_LENS[category] as Lens | undefined;
    if (lens) weights[lens] = value;
  });
  return weights;
}

function seededUnit(seed: number): number {
  const value = Math.sin((seed + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return viewport;
}

function fallbackPlotRect(viewport: Viewport): ChoreographyRect {
  const compact = viewport.width <= 820;
  const bottomChrome =
    (compact ? DETAILS_HEIGHT_MOBILE : DETAILS_HEIGHT) +
    (compact ? LEGEND_HEIGHT_MOBILE : LEGEND_HEIGHT);

  return {
    left: 0,
    top: FALLBACK_HEADER_HEIGHT,
    width: viewport.width,
    height: Math.max(260, viewport.height - FALLBACK_HEADER_HEIGHT - bottomChrome),
  };
}

function useNetworkPlotRect(viewport: Viewport): ChoreographyRect | null {
  const [rect, setRect] = useState<ChoreographyRect | null>(null);

  useLayoutEffect(() => {
    const plot = document.querySelector<HTMLElement>("[data-word-network-plot]");
    if (!plot) {
      setRect(null);
      return;
    }

    const update = () => {
      const next = plot.getBoundingClientRect();
      setRect({
        left: next.left,
        top: next.top,
        width: Math.round(next.width),
        height: Math.round(next.height),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(plot);
    return () => observer.disconnect();
  }, [viewport]);

  return rect;
}

function makeTargets(
  park: ParkForChoreography,
  viewport: Viewport,
  plotRect: ChoreographyRect | null,
): TargetWord[] {
  const frame = plotRect ?? fallbackPlotRect(viewport);
  const canvasPaddingX =
    frame.width < 640 ? MOBILE_PADDING_X : DESKTOP_PADDING_X;
  const canvasPaddingY =
    frame.height < 520 ? MOBILE_PADDING_Y : DESKTOP_PADDING_Y;
  const graphWidth = Math.max(240, frame.width - canvasPaddingX * 2);
  const graphHeight = Math.max(260, frame.height - canvasPaddingY * 2);
  const nodes = park.wordNetwork.nodes.map((node) => ({
    term: node.term,
    category: node.category,
    frequency: node.frequency,
    exampleExcerpt: node.exampleExcerpt,
    id: node.id,
  })) satisfies (Node & { id: string })[];
  const layout = runLayout(nodes, park.wordNetwork.edges, graphWidth, graphHeight);
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;

  return layout.nodes.slice(0, PARTICLE_LIMIT).map((node, index) => {
    const theta = seededUnit(index * 19 + node.term.length) * Math.PI * 2;
    const radius = 20 + seededUnit(index * 29 + node.frequency) * 90;

    return {
      id: node.id ?? node.term,
      term: node.term,
      category: node.category,
      frequency: node.frequency,
      fontSize: node.fontSize,
      x: frame.left + canvasPaddingX + (node.x ?? 0),
      y: frame.top + canvasPaddingY + (node.y ?? 0),
      particleSize: Math.max(9, Math.min(18, node.fontSize * 0.36)),
      startX: centerX + Math.cos(theta) * radius,
      startY: centerY + Math.sin(theta) * radius,
    };
  });
}

function rectCenter(rect: ChoreographyRect | undefined, viewport: Viewport) {
  return rect
    ? {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        size: Math.max(rect.width, rect.height),
      }
    : {
        x: viewport.width / 2,
        y: viewport.height / 2,
        size: 160,
      };
}

export function ActIIChoreography({
  mode,
  parkId,
  sourceRect,
  targetRect,
}: {
  mode: ActIIChoreographyMode;
  parkId: string;
  sourceRect?: ChoreographyRect;
  targetRect?: ChoreographyRect;
}) {
  const viewport = useViewport();
  const plotRect = useNetworkPlotRect(viewport);
  const park = useMemo(() => findPark(parkId), [parkId]);
  const hasMeasuredPlot = Boolean(plotRect);
  const targets = useMemo(
    () => makeTargets(park, viewport, plotRect),
    [park, plotRect, viewport],
  );
  const source = rectCenter(sourceRect, viewport);
  const target = rectCenter(targetRect, viewport);
  const center = {
    x: viewport.width / 2,
    y: viewport.height / 2,
    size: mode === "to-park" ? PARK_CENTER_BLOB_SIZE : MAP_CENTER_BLOB_SIZE,
  };

  const blobStyle = {
    "--blob-start-x": `${mode === "to-park" ? source.x : center.x}px`,
    "--blob-start-y": `${mode === "to-park" ? source.y : center.y}px`,
    "--blob-start-size": `${mode === "to-park" ? source.size : center.size}px`,
    "--blob-dx": `${(mode === "to-park" ? center.x : target.x) - (mode === "to-park" ? source.x : center.x)}px`,
    "--blob-dy": `${(mode === "to-park" ? center.y : target.y) - (mode === "to-park" ? source.y : center.y)}px`,
    "--blob-scale": mode === "to-park"
      ? PARK_CENTER_BLOB_SIZE / Math.max(1, source.size)
      : target.size / Math.max(1, center.size),
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={`actii-choreo actii-choreo--${mode}`}
    >
      <div className="actii-choreo__wash" />
      {mode === "to-park" ? (
        <div className="actii-choreo__blob" style={blobStyle}>
          <Blob
            breathing={false}
            colorOrder="ascending"
            size={source.size}
            weights={weightsForBlob(park.categoryWeights)}
          />
        </div>
      ) : null}

      {hasMeasuredPlot ? (
        <div className="actii-choreo__particles">
          {targets.map((word, index) => {
          const startX = mode === "to-park" ? word.startX : word.x;
          const startY = mode === "to-park" ? word.startY : word.y;
          const endX = mode === "to-park" ? word.x : target.x;
          const endY = mode === "to-park" ? word.y : target.y;
          const delay = mode === "to-park" ? 220 + index * 6 : index * 3;

            return (
              <span
                className="actii-choreo__particle"
                key={`${word.id}-${index}`}
                style={
                  {
                    "--particle-color": lensColour(word.category),
                    "--particle-size": `${word.particleSize}px`,
                    "--particle-x": `${startX}px`,
                    "--particle-y": `${startY}px`,
                    "--particle-dx": `${endX - startX}px`,
                    "--particle-dy": `${endY - startY}px`,
                    "--particle-delay": `${delay}ms`,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>
      ) : null}

      {mode === "to-park" && hasMeasuredPlot ? (
        <div className="actii-choreo__words">
          {targets.map((word, index) => (
            <span
              className="actii-choreo__word"
              key={word.id}
              style={
                {
                  "--word-color": lensColour(word.category),
                  "--word-x": `${word.x}px`,
                  "--word-y": `${word.y}px`,
                  "--word-size": `${word.fontSize}px`,
                  "--word-delay": `${1060 + index * 5}ms`,
                } as CSSProperties
              }
            >
              {word.term}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
