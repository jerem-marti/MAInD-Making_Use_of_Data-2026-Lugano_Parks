import type { Park } from "../data/types";

/**
 * Phase-3 inspector header. NOT the polished View B header strip with
 * cycle arrows / aura / Compare button — that's a Phase 4 concern.
 *
 * Renders:
 *   - park <select> dropdown (calls onParkChange when user picks one)
 *   - debug toggle row (just the all-edges checkbox)
 *   - stats readout pinned to the right
 */
export type HeaderHandles = {
  setStats(park: Park): void;
};

export function mountHeader(
  root: HTMLElement,
  parks: Park[],
  initialIndex: number,
  onParkChange: (index: number) => void,
  onAllEdgesToggle: (visible: boolean) => void,
): HeaderHandles {
  root.innerHTML = `
    <div class="top-bar">
      <strong>View B prototype</strong>
      <select id="park-select"></select>
      <div class="debug-toggles">
        <label>
          <input type="checkbox" id="toggle-all-edges" />
          show all edges (faint)
        </label>
      </div>
      <div class="stats-readout" id="stats-readout"></div>
    </div>
  `;

  const select = root.querySelector<HTMLSelectElement>("#park-select")!;
  for (let i = 0; i < parks.length; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = parks[i].name;
    select.appendChild(opt);
  }
  select.value = String(initialIndex);
  select.addEventListener("change", () => {
    onParkChange(Number(select.value));
  });

  const allEdgesToggle = root.querySelector<HTMLInputElement>(
    "#toggle-all-edges",
  )!;
  allEdgesToggle.addEventListener("change", () => {
    onAllEdgesToggle(allEdgesToggle.checked);
  });

  const stats = root.querySelector<HTMLDivElement>("#stats-readout")!;

  return {
    setStats(park: Park) {
      stats.innerHTML = `
        <span><strong>${park.totalMentions}</strong> mentions</span>
        <span><strong>${park.distinctTermsCount}</strong> distinct terms</span>
        <span><strong>${park.edges.length}</strong> edges</span>
      `;
    },
  };
}
