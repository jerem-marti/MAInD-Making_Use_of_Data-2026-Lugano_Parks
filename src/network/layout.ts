import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

import type { Category, Edge, Node } from "../data/types";

/**
 * Centroid coordinates for each category, expressed as fractions of the
 * canvas. Hexagonal arrangement defined in the Phase 3 spec. Resolved to
 * pixels per simulation by multiplying by canvas width / height.
 */
export const CATEGORY_CENTROIDS: Record<Category, { fx: number; fy: number }> = {
  experiential_emotional:    { fx: 0.5,  fy: 0.18 },
  sensory_environmental:     { fx: 0.22, fy: 0.35 },
  action:                    { fx: 0.78, fy: 0.35 },
  tension_complaint:         { fx: 0.22, fy: 0.65 },
  relational_context:        { fx: 0.78, fy: 0.65 },
  infrastructure_amenities:  { fx: 0.5,  fy: 0.82 },
};

export type SimNode = SimulationNodeDatum &
  Node & {
    fontSize: number;
    radius: number;
  };

export type SimEdge = SimulationLinkDatum<SimNode> & {
  weight: number;
};

export type ForceParams = {
  clusterStrength: number;
  chargeStrength: number; // multiplier on -sqrt(frequency); higher → more repulsion
  edgeStrength: number;
  edgeDistance: number;
};

export const DEFAULT_FORCE_PARAMS: ForceParams = {
  clusterStrength: 0.12,
  chargeStrength: 30,
  edgeStrength: 0.05,
  edgeDistance: 60,
};

/**
 * Word-network font size. Per design system §4.4:
 *   fontSize = 11 + 21 * (log(frequency) / log(maxFrequency))
 * Range: 11px (rare) to 32px (max-frequency word).
 * maxFrequency is per-park so smaller parks still use the full range.
 */
export function computeFontSize(frequency: number, maxFrequency: number): number {
  if (maxFrequency <= 1) return 11;
  const f = Math.max(1, frequency);
  return 11 + 21 * (Math.log(f) / Math.log(maxFrequency));
}

/**
 * Approximate text width: each character ~0.6 of font size. Used as the
 * collision radius (half the rendered width plus padding).
 */
export function computeRadius(term: string, fontSize: number): number {
  const w = term.length * fontSize * 0.6;
  const h = fontSize;
  return Math.max(w, h) / 2 + 4;
}

export type LayoutResult = {
  nodes: SimNode[];
  edges: SimEdge[];
};

/**
 * Build the SimNode/SimEdge arrays and run the simulation to convergence.
 * Caller passes canvas width/height in pixels. We seed positions at
 * category centroids so the layout stabilises faster.
 */
export function runLayout(
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number,
  params: ForceParams = DEFAULT_FORCE_PARAMS,
): LayoutResult {
  const maxFrequency = nodes.reduce((m, n) => Math.max(m, n.frequency), 1);

  const simNodes: SimNode[] = nodes.map((n) => {
    const fontSize = computeFontSize(n.frequency, maxFrequency);
    const centroid = CATEGORY_CENTROIDS[n.category];
    // Seed near the category centroid with a small random jitter so
    // collision and edge forces have something to disambiguate.
    const jitter = 30;
    return {
      ...n,
      fontSize,
      radius: computeRadius(n.term, fontSize),
      x: centroid.fx * width + (Math.random() - 0.5) * jitter,
      y: centroid.fy * height + (Math.random() - 0.5) * jitter,
    };
  });

  const nodeByTerm = new Map(simNodes.map((n) => [n.term, n]));
  const simEdges: SimEdge[] = [];
  for (const e of edges) {
    const source = nodeByTerm.get(e.source);
    const target = nodeByTerm.get(e.target);
    if (!source || !target) continue;
    simEdges.push({ source, target, weight: e.weight });
  }

  const sim = buildSimulation(simNodes, simEdges, width, height, params);

  // Run synchronously to convergence; we render only the final frame.
  // alpha decays from 1 toward alphaMin (default 0.001).
  while (sim.alpha() > sim.alphaMin()) {
    sim.tick();
    clampToCanvas(simNodes, width, height);
  }
  sim.stop();

  return { nodes: simNodes, edges: simEdges };
}

function clampToCanvas(nodes: SimNode[], width: number, height: number): void {
  for (const n of nodes) {
    const r = n.radius;
    if (n.x !== undefined) n.x = Math.max(r, Math.min(width - r, n.x));
    if (n.y !== undefined) n.y = Math.max(r, Math.min(height - r, n.y));
  }
}

function buildSimulation(
  nodes: SimNode[],
  edges: SimEdge[],
  width: number,
  height: number,
  params: ForceParams,
): Simulation<SimNode, SimEdge> {
  const sim = forceSimulation(nodes)
    .alphaDecay(0.02)
    .force(
      "charge",
      forceManyBody<SimNode>().strength(
        (d) => -params.chargeStrength * Math.sqrt(d.frequency),
      ),
    )
    .force(
      "x",
      forceX<SimNode>()
        .x((d) => CATEGORY_CENTROIDS[d.category].fx * width)
        .strength(params.clusterStrength),
    )
    .force(
      "y",
      forceY<SimNode>()
        .y((d) => CATEGORY_CENTROIDS[d.category].fy * height)
        .strength(params.clusterStrength),
    )
    .force(
      "collide",
      forceCollide<SimNode>()
        .radius((d) => d.radius)
        .strength(0.9)
        .iterations(2),
    )
    .force(
      "link",
      forceLink<SimNode, SimEdge>(edges)
        .id((d) => d.term)
        .distance(params.edgeDistance)
        .strength(params.edgeStrength),
    );
  return sim;
}
