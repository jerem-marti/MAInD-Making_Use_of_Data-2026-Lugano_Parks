import {
  CATEGORY_LABELS,
  CATEGORY_TOKENS,
  type Node,
} from "../data/types";

/**
 * Fixed bottom-left tooltip. Shown when a word is hovered or pinned;
 * hidden otherwise. Position is fixed by CSS, not by mouse position —
 * the spec calls for a stable corner so people don't have to chase it.
 */
export type TooltipHandles = {
  show(node: Node): void;
  hide(): void;
};

export function mountTooltip(root: HTMLElement): TooltipHandles {
  root.className = "tooltip";
  root.innerHTML = `
    <div class="term"></div>
    <div class="meta">
      <span class="tag-pill">
        <span class="dot"></span>
        <span class="cat-name"></span>
      </span>
      <span><span class="freq"></span><span class="freq-label"> mentions</span></span>
    </div>
    <div class="excerpt"></div>
  `;

  const termEl = root.querySelector<HTMLDivElement>(".term")!;
  const dotEl = root.querySelector<HTMLSpanElement>(".dot")!;
  const catNameEl = root.querySelector<HTMLSpanElement>(".cat-name")!;
  const freqEl = root.querySelector<HTMLSpanElement>(".freq")!;
  const excerptEl = root.querySelector<HTMLDivElement>(".excerpt")!;

  return {
    show(node: Node) {
      termEl.textContent = node.term;
      dotEl.style.background = `var(${CATEGORY_TOKENS[node.category]})`;
      catNameEl.textContent = CATEGORY_LABELS[node.category];
      freqEl.textContent = String(node.frequency);
      excerptEl.textContent = node.exampleExcerpt
        ? `"${node.exampleExcerpt}"`
        : "";
      root.classList.add("is-visible");
    },
    hide() {
      root.classList.remove("is-visible");
    },
  };
}
