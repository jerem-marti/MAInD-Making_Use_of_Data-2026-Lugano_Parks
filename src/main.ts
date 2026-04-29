import "./styles.css";
import {
  DEFAULT_FORCE_PARAMS,
  runLayout,
  type ForceParams,
} from "./network/layout";
import { renderNetwork } from "./network/render";
import { attachInteractions } from "./network/interactions";
import { mountHeader } from "./ui/header";
import { mountLegend } from "./ui/legend";
import { mountTooltip } from "./ui/tooltip";
import { mountForcePanel } from "./ui/force-panel";
import type { Park, ParksData } from "./data/types";

const app = document.getElementById("app")!;
app.innerHTML = `
  <div id="header"></div>
  <div class="network-stage" id="stage">
    <div id="force-panel"></div>
    <div id="tooltip"></div>
  </div>
  <div id="legend"></div>
`;

const headerRoot = document.getElementById("header")!;
const stage = document.getElementById("stage") as HTMLDivElement;
const tooltipRoot = document.getElementById("tooltip")!;
const forcePanelRoot = document.getElementById("force-panel")!;
const legendRoot = document.getElementById("legend")!;

(async () => {
  const res = await fetch("/data/parks.json");
  const data: ParksData = await res.json();

  const tooltip = mountTooltip(tooltipRoot);
  const legend = mountLegend(legendRoot);

  let parkIndex = 0;
  let forceParams: ForceParams = { ...DEFAULT_FORCE_PARAMS };
  let allEdgesVisible = false;

  const header = mountHeader(
    headerRoot,
    data.parks,
    parkIndex,
    (i) => {
      parkIndex = i;
      rebuild();
    },
    (visible) => {
      allEdgesVisible = visible;
      currentInteractions?.setAllEdgesVisible(visible);
    },
  );

  const forcePanel = mountForcePanel(forcePanelRoot, forceParams, (p) => {
    forceParams = p;
    rebuild();
  });

  let currentInteractions: ReturnType<typeof attachInteractions> | null = null;

  function rebuild() {
    const park: Park = data.parks[parkIndex];
    const stageRect = stage.getBoundingClientRect();
    const w = Math.max(800, stageRect.width);
    const h = Math.max(600, stageRect.height);

    const { nodes, edges } = runLayout(
      park.nodes,
      park.edges,
      w,
      h,
      forceParams,
    );

    // Render only the network into stage (preserve the panel + tooltip).
    let networkLayer = stage.querySelector<HTMLDivElement>(".network-layer");
    if (!networkLayer) {
      networkLayer = document.createElement("div");
      networkLayer.className = "network-layer";
      networkLayer.style.position = "absolute";
      networkLayer.style.inset = "0";
      stage.insertBefore(networkLayer, stage.firstChild);
    }
    const render = renderNetwork(networkLayer, nodes, edges, w, h);
    currentInteractions = attachInteractions(render, tooltip);
    currentInteractions.setAllEdgesVisible(allEdgesVisible);

    header.setStats(park);
    legend.setCounts(park);
    forcePanel.setValues(forceParams);

    console.log(
      `Rendered ${park.name}: ${nodes.length} nodes, ${edges.length} edges, ` +
        `params ${JSON.stringify(forceParams)}`,
    );
  }

  rebuild();
})();
