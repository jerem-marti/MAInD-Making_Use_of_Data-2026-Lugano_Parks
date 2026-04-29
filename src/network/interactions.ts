import { CATEGORY_TOKENS, type Category } from "../data/types";
import type { NetworkRender } from "./render";
import type { SimNode, SimEdge } from "./layout";
import type { TooltipHandles } from "../ui/tooltip";

/**
 * Hover behaviour for the network:
 *   - Same-category words light up in their category colour
 *   - Other words dim to 30% opacity
 *   - Edges from the hovered word fade in at 50% opacity in the
 *     hovered word's category colour
 *   - Tooltip in the bottom-left shows the term, category, frequency,
 *     and an example excerpt
 *
 * `allEdgesVisible` is a separate inspector toggle: when on, all edges
 * sit at a faint baseline opacity so we can see overall connectivity.
 * Hover state takes precedence — incident edges go to 50%.
 */
export type InteractionHandles = {
  setAllEdgesVisible(visible: boolean): void;
};

const DIM_OPACITY = 0.3;
const HOVER_EDGE_OPACITY = 0.5;
const ALL_EDGES_OPACITY = 0.08;

export function attachInteractions(
  render: NetworkRender,
  tooltip: TooltipHandles,
): InteractionHandles {
  let allEdgesVisible = false;

  const cssVar = (token: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(token).trim();

  const baseEdgeOpacity = () => (allEdgesVisible ? ALL_EDGES_OPACITY : 0);
  const baseEdgeStroke = () => "var(--color-text-quaternary)";

  function resetStyles() {
    render.nodeSel
      .style("opacity", null)
      .style("fill", null)
      .style("font-weight", null);
    render.edgeSel
      .style("opacity", baseEdgeOpacity())
      .style("stroke", baseEdgeStroke());
  }

  function highlight(target: SimNode) {
    const cat: Category = target.category;
    const colour = `var(${CATEGORY_TOKENS[cat]})`;

    render.nodeSel.each(function (d) {
      const sel = this as SVGTextElement;
      if (d.category === cat) {
        sel.style.opacity = "1";
        sel.style.fill = colour;
        sel.style.fontWeight = d === target ? "500" : "500";
      } else {
        sel.style.opacity = String(DIM_OPACITY);
        sel.style.fill = "";
        sel.style.fontWeight = "";
      }
    });

    render.edgeSel.each(function (e) {
      const sel = this as SVGLineElement;
      const incident =
        (e.source as SimNode).term === target.term ||
        (e.target as SimNode).term === target.term;
      if (incident) {
        sel.style.opacity = String(HOVER_EDGE_OPACITY);
        sel.style.stroke = cssVar(CATEGORY_TOKENS[cat]);
      } else {
        sel.style.opacity = String(baseEdgeOpacity());
        sel.style.stroke = "";
      }
    });
  }

  render.nodeSel
    .on("mouseenter", function (_event, d) {
      highlight(d);
      tooltip.show(d);
    })
    .on("mouseleave", function () {
      resetStyles();
      tooltip.hide();
    });

  resetStyles();

  return {
    setAllEdgesVisible(visible: boolean) {
      allEdgesVisible = visible;
      // Apply baseline to any edge currently at the default state.
      render.edgeSel.style("opacity", baseEdgeOpacity());
    },
  };
}

// SimEdge is exported indirectly through NetworkRender; re-import to keep
// this file's surface area minimal.
export type { SimEdge };
