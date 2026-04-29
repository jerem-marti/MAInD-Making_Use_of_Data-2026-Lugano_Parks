import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_TOKENS,
  type Park,
} from "../data/types";

/**
 * Six-category legend strip pinned to the bottom of the stage. For phase 3
 * this is informational only — clickable filtering is a phase 4 concern.
 */
export type LegendHandles = {
  setCounts(park: Park): void;
};

export function mountLegend(root: HTMLElement): LegendHandles {
  root.innerHTML = "";
  root.className = "legend";

  const items: HTMLSpanElement[] = [];
  for (const cat of CATEGORIES) {
    const pill = document.createElement("span");
    pill.className = "tag-pill";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = `var(${CATEGORY_TOKENS[cat]})`;
    const label = document.createElement("span");
    label.dataset.category = cat;
    label.textContent = `${CATEGORY_LABELS[cat]} · 0`;
    pill.appendChild(dot);
    pill.appendChild(label);
    root.appendChild(pill);
    items.push(label);
  }

  return {
    setCounts(park: Park) {
      for (let i = 0; i < CATEGORIES.length; i++) {
        const cat = CATEGORIES[i];
        const count = park.categoryCounts[cat] ?? 0;
        items[i].textContent = `${CATEGORY_LABELS[cat]} · ${count}`;
      }
    },
  };
}
