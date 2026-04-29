import { select, type Selection } from "d3-selection";
import type { SimNode, SimEdge } from "./layout";

const SVG_NS = "http://www.w3.org/2000/svg";

export type NetworkRender = {
  svg: SVGSVGElement;
  nodeSel: Selection<SVGTextElement, SimNode, SVGGElement, unknown>;
  edgeSel: Selection<SVGLineElement, SimEdge, SVGGElement, unknown>;
};

/**
 * Render the laid-out network into the given mount element. Edges are
 * rendered with opacity 0 by default (kept in DOM for later interaction).
 * Returns selections so interactions.ts can attach event handlers and
 * mutate styling without re-querying.
 */
export function renderNetwork(
  mount: HTMLElement,
  nodes: SimNode[],
  edges: SimEdge[],
  width: number,
  height: number,
): NetworkRender {
  mount.innerHTML = "";
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "network-svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  mount.appendChild(svg);

  const root = select(svg);
  const edgeGroup = root.append("g").attr("class", "edges");
  const nodeGroup = root.append("g").attr("class", "nodes");

  const edgeSel = edgeGroup
    .selectAll<SVGLineElement, SimEdge>("line")
    .data(edges)
    .enter()
    .append("line")
    .attr("x1", (d) => (d.source as SimNode).x ?? 0)
    .attr("y1", (d) => (d.source as SimNode).y ?? 0)
    .attr("x2", (d) => (d.target as SimNode).x ?? 0)
    .attr("y2", (d) => (d.target as SimNode).y ?? 0)
    .attr("opacity", 0);

  const nodeSel = nodeGroup
    .selectAll<SVGTextElement, SimNode>("text")
    .data(nodes, (d: SimNode) => d.term)
    .enter()
    .append("text")
    .attr("x", (d) => d.x ?? 0)
    .attr("y", (d) => d.y ?? 0)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("font-size", (d) => d.fontSize)
    .attr("data-term", (d) => d.term)
    .attr("data-category", (d) => d.category)
    .text((d) => d.term);

  return { svg, nodeSel, edgeSel };
}
