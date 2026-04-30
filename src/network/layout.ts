import {
  forceCollide,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";

import type { Category, Edge, Node } from "../data/types";

/**
 * Fixed category geography for View B. Coordinates are fractions of the
 * canvas and are resolved to pixels per simulation.
 */
export const CATEGORY_CENTROIDS: Record<Category, { fx: number; fy: number }> = {
  experiential_emotional: { fx: 0.5, fy: 0.18 },
  sensory_environmental: { fx: 0.22, fy: 0.38 },
  action: { fx: 0.78, fy: 0.38 },
  relational_context: { fx: 0.78, fy: 0.68 },
  infrastructure_amenities: { fx: 0.5, fy: 0.88 },
  tension_complaint: { fx: 0.22, fy: 0.68 },
};

export type SimNode = SimulationNodeDatum &
  Node & {
    id?: string;
    fontSize: number;
    radius: number;
  };

export type SimEdge = {
  source: SimNode;
  target: SimNode;
  weight: number;
};

export type ForceParams = {
  clusterStrength: number;
  chargeStrength: number;
  edgeStrength: number;
  edgeDistance: number;
};

export const DEFAULT_FORCE_PARAMS: ForceParams = {
  clusterStrength: 0.16,
  chargeStrength: 30,
  edgeStrength: 0,
  edgeDistance: 0,
};

export function computeFontSize(frequency: number, maxFrequency: number): number {
  if (maxFrequency <= 0) return 12;
  return 12 + 36 * Math.sqrt(Math.max(0, frequency) / maxFrequency);
}

export function computeRadius(term: string, fontSize: number): number {
  const width = term.length * fontSize * 0.6;
  return Math.max(width, fontSize) / 2 + 6;
}

export type LayoutResult = {
  nodes: SimNode[];
  edges: SimEdge[];
};

export function runLayout(
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number,
  params: ForceParams = DEFAULT_FORCE_PARAMS,
): LayoutResult {
  const maxFrequency = nodes.reduce((max, node) => {
    return Math.max(max, node.frequency);
  }, 1);

  const simNodes: SimNode[] = nodes.map((node) => {
    const fontSize = computeFontSize(node.frequency, maxFrequency);
    const centroid = CATEGORY_CENTROIDS[node.category];
    const seed = hashTerm(node.term);
    const jitter = 30;

    return {
      ...node,
      fontSize,
      radius: computeRadius(node.term, fontSize),
      x: centroid.fx * width + (seededUnit(seed) - 0.5) * jitter,
      y: centroid.fy * height + (seededUnit(seed + 17) - 0.5) * jitter,
    };
  });

  const nodeByTerm = new Map(simNodes.map((node) => [node.term, node]));
  const simEdges: SimEdge[] = edges
    .map((edge) => {
      const source = nodeByTerm.get(edge.source);
      const target = nodeByTerm.get(edge.target);
      return source && target
        ? { source, target, weight: edge.weight }
        : undefined;
    })
    .filter((edge): edge is SimEdge => Boolean(edge));

  const sim = buildSimulation(simNodes, width, height, params);

  for (let i = 0; i < 320; i++) {
    sim.tick();
    clampToCanvas(simNodes, width, height);
  }

  sim.stop();
  relaxTextOverlaps(simNodes, width, height);

  return { nodes: simNodes, edges: simEdges };
}

function hashTerm(term: string): number {
  let hash = 2166136261;
  for (let i = 0; i < term.length; i++) {
    hash ^= term.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: number): number {
  const value = Math.sin((seed + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function clampToCanvas(nodes: SimNode[], width: number, height: number): void {
  for (const node of nodes) {
    const radius = node.radius;
    if (node.x !== undefined) {
      node.x = Math.max(radius, Math.min(width - radius, node.x));
    }
    if (node.y !== undefined) {
      node.y = Math.max(radius, Math.min(height - radius, node.y));
    }
  }
}

function textBox(node: SimNode) {
  return {
    width: node.term.length * node.fontSize * 0.6 + 8,
    height: node.fontSize + 4,
  };
}

function relaxTextOverlaps(
  nodes: SimNode[],
  width: number,
  height: number,
): void {
  for (let pass = 0; pass < 48; pass++) {
    let moved = false;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const ax = a.x ?? 0;
        const ay = a.y ?? 0;
        const bx = b.x ?? 0;
        const by = b.y ?? 0;
        const aBox = textBox(a);
        const bBox = textBox(b);
        const overlapX = (aBox.width + bBox.width) / 2 - Math.abs(ax - bx);
        const overlapY = (aBox.height + bBox.height) / 2 - Math.abs(ay - by);

        if (overlapX <= 0 || overlapY <= 0) continue;

        moved = true;
        if (overlapX < overlapY) {
          const direction = ax <= bx ? -1 : 1;
          const shift = overlapX / 2 + 1;
          a.x = ax + direction * shift;
          b.x = bx - direction * shift;
        } else {
          const direction = ay <= by ? -1 : 1;
          const shift = overlapY / 2 + 1;
          a.y = ay + direction * shift;
          b.y = by - direction * shift;
        }
      }
    }

    clampToCanvas(nodes, width, height);
    if (!moved) return;
  }
}

function buildSimulation(
  nodes: SimNode[],
  width: number,
  height: number,
  params: ForceParams,
): Simulation<SimNode, undefined> {
  return forceSimulation(nodes)
    .force("charge", forceManyBody<SimNode>().strength(-params.chargeStrength))
    .force(
      "x",
      forceX<SimNode>()
        .x((node) => CATEGORY_CENTROIDS[node.category].fx * width)
        .strength(params.clusterStrength),
    )
    .force(
      "y",
      forceY<SimNode>()
        .y((node) => CATEGORY_CENTROIDS[node.category].fy * height)
        .strength(params.clusterStrength),
    )
    .force(
      "collide",
      forceCollide<SimNode>()
        .radius((node) => node.radius)
        .strength(0.72)
        .iterations(3),
    );
}
