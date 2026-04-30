import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import parksData from "../../data/parks.json";
import {
  CATEGORIES,
  CATEGORY_TOKENS,
  type Category,
  type Edge,
  type Node,
  type WordNetworkNode,
} from "../../data/types";
import { runLayout, type SimEdge, type SimNode } from "../../network/layout";
import { useActII } from "../../state/ActIIContext";
import styles from "./WordNetwork.module.css";

type Size = {
  width: number;
  height: number;
};

type ParkWithWordNetwork = {
  id: string;
  name: string;
  wordNetwork: {
    nodes: WordNetworkNode[];
    edges: Edge[];
  };
};

const MIN_CANVAS_WIDTH = 320;
const MIN_CANVAS_HEIGHT = 360;
const DESKTOP_CANVAS_PADDING_X = 56;
const DESKTOP_CANVAS_PADDING_Y = 44;
const MOBILE_CANVAS_PADDING_X = 28;
const MOBILE_CANVAS_PADDING_Y = 28;
const MIN_GRAPH_WIDTH = 240;
const MIN_GRAPH_HEIGHT = 260;
const HOVER_SCALE = 1.1;
const EDGE_TEXT_GAP = 5;

const LEGEND_ORDER: Category[] = [
  "experiential_emotional",
  "sensory_environmental",
  "action",
  "relational_context",
  "infrastructure_amenities",
  "tension_complaint",
];

const CATEGORY_NAMES: Record<Category, string> = {
  experiential_emotional: "Emotional",
  sensory_environmental: "Sensory",
  action: "Action",
  relational_context: "Relational",
  infrastructure_amenities: "Infrastructure",
  tension_complaint: "Tension",
};

type HighlightState = {
  activeNode: SimNode | null;
  activeTerm: string | null;
  activeCategory: Category | null;
  connectedTerms: Set<string>;
};

function useElementSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize((previous) => {
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        return previous.width === width && previous.height === height
          ? previous
          : { width, height };
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

function findPark(parkId: string | null): ParkWithWordNetwork {
  const parks = parksData.parks as ParkWithWordNetwork[];
  return parks.find((park) => park.id === parkId) ?? parks[0];
}

function lensColour(category: Category): string {
  return `var(${CATEGORY_TOKENS[category]})`;
}

function approxTextBox(node: SimNode) {
  return {
    width: node.term.length * node.fontSize * 0.6 + 14,
    height: node.fontSize + 12,
  };
}

function nodeTransform(node: SimNode, activeTerm: string | null): string | undefined {
  if (node.term !== activeTerm) return undefined;
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  return `translate(${x} ${y}) scale(${HOVER_SCALE}) translate(${-x} ${-y})`;
}

function edgeEndpoint(from: SimNode, to: SimNode) {
  const fromX = from.x ?? 0;
  const fromY = from.y ?? 0;
  const toX = to.x ?? 0;
  const toY = to.y ?? 0;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return { x: fromX, y: fromY };
  }

  const box = approxTextBox(from);
  const unitX = dx / distance;
  const unitY = dy / distance;
  const halfWidth = box.width / 2 + EDGE_TEXT_GAP;
  const halfHeight = box.height / 2 + EDGE_TEXT_GAP;
  const xLimit = Math.abs(unitX) > 0.0001 ? halfWidth / Math.abs(unitX) : Infinity;
  const yLimit = Math.abs(unitY) > 0.0001 ? halfHeight / Math.abs(unitY) : Infinity;
  const offset = Math.min(distance / 2, xLimit, yLimit);

  return {
    x: fromX + unitX * offset,
    y: fromY + unitY * offset,
  };
}

function edgeSegment(edge: SimEdge) {
  const source = edgeEndpoint(edge.source, edge.target);
  const target = edgeEndpoint(edge.target, edge.source);

  return {
    x1: source.x,
    y1: source.y,
    x2: target.x,
    y2: target.y,
  };
}

function keyForPair(a: string, b: string): string {
  return a < b ? `${a}--${b}` : `${b}--${a}`;
}

function buildConnections(edges: Edge[]) {
  const byTerm = new Map<string, Set<string>>();

  edges.forEach((edge) => {
    const sourceSet = byTerm.get(edge.source) ?? new Set<string>();
    sourceSet.add(edge.target);
    byTerm.set(edge.source, sourceSet);

    const targetSet = byTerm.get(edge.target) ?? new Set<string>();
    targetSet.add(edge.source);
    byTerm.set(edge.target, targetSet);
  });

  return byTerm;
}

function isActivationKey(event: KeyboardEvent): boolean {
  return event.key === "Enter" || event.key === " ";
}

export function WordNetwork() {
  const {
    state: { compareOpen, selectedParkId },
  } = useActII();
  const { ref, size } = useElementSize();
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);
  const [focusedTerm, setFocusedTerm] = useState<string | null>(null);
  const [pinnedTerm, setPinnedTerm] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Category | null>(null);
  const [previewFilter, setPreviewFilter] = useState<Category | null>(null);
  const park = findPark(selectedParkId);
  const width = Math.max(MIN_CANVAS_WIDTH, size.width);
  const height = Math.max(MIN_CANVAS_HEIGHT, size.height);
  const canvasPaddingX = width < 640 ? MOBILE_CANVAS_PADDING_X : DESKTOP_CANVAS_PADDING_X;
  const canvasPaddingY = height < 520 ? MOBILE_CANVAS_PADDING_Y : DESKTOP_CANVAS_PADDING_Y;
  const graphWidth = Math.max(MIN_GRAPH_WIDTH, width - canvasPaddingX * 2);
  const graphHeight = Math.max(MIN_GRAPH_HEIGHT, height - canvasPaddingY * 2);

  const layout = useMemo(() => {
    const nodes = park.wordNetwork.nodes.map((node) => ({
      term: node.term,
      category: node.category,
      frequency: node.frequency,
      exampleExcerpt: node.exampleExcerpt,
      id: node.id,
    })) satisfies (Node & { id: string })[];

    return runLayout(nodes, park.wordNetwork.edges, graphWidth, graphHeight);
  }, [graphHeight, graphWidth, park.id, park.wordNetwork.edges, park.wordNetwork.nodes]);

  const nodesByTerm = useMemo(() => {
    return new Map(layout.nodes.map((node) => [node.term, node]));
  }, [layout.nodes]);

  const edgeKeysByTerm = useMemo(() => {
    const byTerm = new Map<string, Set<string>>();
    layout.edges.forEach((edge) => {
      const key = keyForPair(edge.source.term, edge.target.term);
      const sourceSet = byTerm.get(edge.source.term) ?? new Set<string>();
      sourceSet.add(key);
      byTerm.set(edge.source.term, sourceSet);

      const targetSet = byTerm.get(edge.target.term) ?? new Set<string>();
      targetSet.add(key);
      byTerm.set(edge.target.term, targetSet);
    });
    return byTerm;
  }, [layout.edges]);

  const connections = useMemo(
    () => buildConnections(park.wordNetwork.edges),
    [park.wordNetwork.edges],
  );

  const nodeCounts = useMemo(() => {
    const counts = new Map<Category, number>();
    CATEGORIES.forEach((category) => counts.set(category, 0));
    park.wordNetwork.nodes.forEach((node) => {
      counts.set(node.category, (counts.get(node.category) ?? 0) + 1);
    });
    return counts;
  }, [park.wordNetwork.nodes]);

  useEffect(() => {
    setHoveredTerm(null);
    setFocusedTerm(null);
    setPinnedTerm(null);
    setActiveFilter(null);
    setPreviewFilter(null);
  }, [park.id]);

  useEffect(() => {
    if (!activeFilter) return;
    const pinnedNode = pinnedTerm ? nodesByTerm.get(pinnedTerm) : undefined;
    if (pinnedNode && pinnedNode.category !== activeFilter) {
      setPinnedTerm(null);
    }
  }, [activeFilter, nodesByTerm, pinnedTerm]);

  useEffect(() => {
    if (!pinnedTerm || compareOpen) return;

    const handleEsc = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setPinnedTerm(null);
    };

    window.addEventListener("keydown", handleEsc, { capture: true });
    return () => window.removeEventListener("keydown", handleEsc, { capture: true });
  }, [compareOpen, pinnedTerm]);

  const effectiveFilter = previewFilter ?? activeFilter;
  const candidateActiveTerm = pinnedTerm ?? focusedTerm ?? hoveredTerm;
  const activeNode = candidateActiveTerm
    ? nodesByTerm.get(candidateActiveTerm) ?? null
    : null;
  const activeTerm =
    activeNode && (!effectiveFilter || activeNode.category === effectiveFilter)
      ? activeNode.term
      : null;
  const activeCategory = activeTerm
    ? nodesByTerm.get(activeTerm)?.category ?? null
    : null;
  const connectedTerms = activeTerm
    ? connections.get(activeTerm) ?? new Set<string>()
    : new Set<string>();
  const activeEdgeKeys = activeTerm
    ? edgeKeysByTerm.get(activeTerm) ?? new Set<string>()
    : new Set<string>();
  const highlight: HighlightState = {
    activeNode: activeTerm ? nodesByTerm.get(activeTerm) ?? null : null,
    activeTerm,
    activeCategory,
    connectedTerms,
  };
  const hasReset = Boolean(activeFilter || pinnedTerm);

  const togglePin = (term: string) => {
    const node = nodesByTerm.get(term);
    if (!node) return;
    if (effectiveFilter && node.category !== effectiveFilter) return;
    setPinnedTerm((previous) => (previous === term ? null : term));
  };

  const toggleFilter = (category: Category) => {
    setPreviewFilter(null);
    setActiveFilter((previous) => {
      const next = previous === category ? null : category;
      const pinnedNode = pinnedTerm ? nodesByTerm.get(pinnedTerm) : undefined;
      if (next && pinnedNode && pinnedNode.category !== next) {
        setPinnedTerm(null);
      }
      return next;
    });
  };

  const resetView = () => {
    setActiveFilter(null);
    setPreviewFilter(null);
    setPinnedTerm(null);
    setHoveredTerm(null);
    setFocusedTerm(null);
  };

  return (
    <div className={styles.network}>
      <div className={styles.frame}>
        <div className={styles.plot} ref={ref}>
          {size.width > 0 && size.height > 0 ? (
            <svg
              aria-label={`Word network for ${park.name}`}
              className={styles.svg}
              onPointerLeave={() => setHoveredTerm(null)}
              role="img"
              viewBox={`0 0 ${width} ${height}`}
            >
              <rect
                className={styles.hitArea}
                height={height}
                onPointerDown={() => setPinnedTerm(null)}
                width={width}
                x={0}
                y={0}
              />
              <g transform={`translate(${canvasPaddingX} ${canvasPaddingY})`}>
                <g aria-hidden="true">
                  {layout.edges.map((edge) => {
                    const edgeKey = keyForPair(edge.source.term, edge.target.term);
                    const visible = activeEdgeKeys.has(edgeKey) && highlight.activeCategory;
                    const segment = edgeSegment(edge);

                    return (
                      <line
                        className={styles.edge}
                        key={edgeKey}
                        style={{
                          stroke: visible ? lensColour(highlight.activeCategory!) : undefined,
                          strokeOpacity: visible ? 0.45 : 0,
                        }}
                        x1={segment.x1}
                        x2={segment.x2}
                        y1={segment.y1}
                        y2={segment.y2}
                      />
                    );
                  })}
                </g>
                {pinnedTerm && nodesByTerm.has(pinnedTerm) ? (
                  <PinnedRing node={nodesByTerm.get(pinnedTerm)!} />
                ) : null}
                <g>
                  {layout.nodes.map((node) => {
                    const style = nodeStyle(node, effectiveFilter, highlight);

                    return (
                      <text
                        aria-label={`${node.term}, ${node.frequency} mentions`}
                        className={styles.node}
                        data-category={node.category}
                        data-term={node.term}
                        dominantBaseline="central"
                        fontSize={node.fontSize}
                        key={node.term}
                        onBlur={() => setFocusedTerm(null)}
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePin(node.term);
                        }}
                        onFocus={() => setFocusedTerm(node.term)}
                        onKeyDown={(event) => {
                          if (isActivationKey(event)) {
                            event.preventDefault();
                            togglePin(node.term);
                          }
                        }}
                        onPointerEnter={() => setHoveredTerm(node.term)}
                        onPointerLeave={() => setHoveredTerm(null)}
                        style={style}
                        tabIndex={style.pointerEvents === "none" ? -1 : 0}
                        textAnchor="middle"
                        transform={nodeTransform(node, highlight.activeTerm)}
                        x={node.x ?? 0}
                        y={node.y ?? 0}
                      >
                        {node.term}
                      </text>
                    );
                  })}
                </g>
              </g>
            </svg>
          ) : (
            <div className={`${styles.empty} t-label-s`}>Preparing network</div>
          )}
        </div>
        <NetworkDetailsRail isPinned={Boolean(pinnedTerm)} node={highlight.activeNode} />
      </div>
      <NetworkLegend
        activeFilter={activeFilter}
        counts={nodeCounts}
        hasReset={hasReset}
        onReset={resetView}
        onToggle={toggleFilter}
        previewFilter={previewFilter}
        setPreviewFilter={setPreviewFilter}
      />
    </div>
  );
}

function nodeStyle(
  node: SimNode,
  filterCategory: Category | null,
  highlight: HighlightState,
): CSSProperties {
  const colour = lensColour(node.category);
  const isFilteredOut = Boolean(filterCategory && node.category !== filterCategory);
  const isActive = highlight.activeTerm === node.term;
  const isSameCategory =
    Boolean(highlight.activeCategory) && node.category === highlight.activeCategory;
  const isConnected = highlight.connectedTerms.has(node.term);

  if (highlight.activeTerm) {
    if (isActive || isSameCategory || isConnected) {
      return {
        fill: isConnected && !isActive && !isSameCategory ? colour : lensColour(highlight.activeCategory!),
        opacity: 1,
        pointerEvents: isFilteredOut && !isActive ? "none" : "all",
      };
    }

    return {
      opacity: isFilteredOut ? 0.15 : 0.7,
      pointerEvents: isFilteredOut ? "none" : "all",
    };
  }

  if (filterCategory) {
    return node.category === filterCategory
      ? {
          fill: colour,
          opacity: 1,
          pointerEvents: "all",
        }
      : {
          opacity: 0.15,
          pointerEvents: "none",
        };
  }

  return {
    opacity: 1,
    pointerEvents: "all",
  };
}

function PinnedRing({ node }: { node: SimNode }) {
  const box = approxTextBox(node);
  const x = (node.x ?? 0) - box.width / 2;
  const y = (node.y ?? 0) - box.height / 2;

  return (
    <rect
      aria-hidden="true"
      className={styles.pinRing}
      height={box.height}
      rx={box.height / 2}
      style={{ stroke: lensColour(node.category) }}
      width={box.width}
      x={x}
      y={y}
    />
  );
}

function NetworkDetailsRail({
  isPinned,
  node,
}: {
  isPinned: boolean;
  node: SimNode | null;
}) {
  if (!node) {
    return (
      <aside className={styles.detailsRail} aria-live="polite">
        <div className={`${styles.detailsPrompt} t-body-s`}>
          Hover or pin a word to read its review context
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.detailsRail} aria-live={isPinned ? "polite" : "off"}>
      <div className={styles.detailsCard}>
        <div className={styles.detailsMeta}>
          <span className="tag-pill">
            <span
              className="dot"
              style={{ background: lensColour(node.category) }}
              aria-hidden="true"
            />
            {CATEGORY_NAMES[node.category]}
          </span>
          <span className={`${styles.detailsCount} t-label-s`}>
            {node.frequency.toLocaleString("en-US")} uses
          </span>
        </div>
        <div
          className={styles.detailsWord}
          style={{ color: lensColour(node.category) }}
        >
          {node.term}
        </div>
        {node.exampleExcerpt ? (
          <blockquote className={`${styles.detailsExcerpt} t-body`}>
            "{node.exampleExcerpt}"
          </blockquote>
        ) : null}
      </div>
    </aside>
  );
}

function NetworkLegend({
  activeFilter,
  counts,
  hasReset,
  onReset,
  onToggle,
  previewFilter,
  setPreviewFilter,
}: {
  activeFilter: Category | null;
  counts: Map<Category, number>;
  hasReset: boolean;
  onReset: () => void;
  onToggle: (category: Category) => void;
  previewFilter: Category | null;
  setPreviewFilter: (category: Category | null) => void;
}) {
  return (
    <footer className={styles.legend}>
      <div className={styles.legendItems}>
        {LEGEND_ORDER.map((category) => {
          const active = activeFilter === category;
          const previewing = previewFilter === category && !active;

          return (
            <button
              aria-pressed={active}
              className={[
                styles.legendButton,
                active ? styles.legendButtonActive : "",
                previewing ? styles.legendButtonPreview : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={category}
              onBlur={() => setPreviewFilter(null)}
              onClick={(event) => {
                event.currentTarget.blur();
                setPreviewFilter(null);
                onToggle(category);
              }}
              onFocus={() => setPreviewFilter(category)}
              onKeyDown={(event) => {
                if (isActivationKey(event)) {
                  event.preventDefault();
                  setPreviewFilter(null);
                  onToggle(category);
                }
              }}
              style={
                {
                  "--lens-color": lensColour(category),
                } as CSSProperties
              }
              type="button"
            >
              <span className={styles.legendTopline}>
                <span className={styles.legendDot} aria-hidden="true" />
                <span>{CATEGORY_NAMES[category]}</span>
              </span>
              <span className={styles.legendCount}>
                {counts.get(category) ?? 0} words
              </span>
            </button>
          );
        })}
      </div>
      {hasReset ? (
        <button className={`${styles.resetLink} link-inline`} onClick={onReset} type="button">
          Reset view
        </button>
      ) : null}
    </footer>
  );
}
