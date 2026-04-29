import "./styles.css";
import { runLayout } from "./network/layout";
import { renderNetwork } from "./network/render";
import type { ParksData } from "./data/types";

const app = document.getElementById("app")!;

app.innerHTML = `
  <div class="top-bar">
    <strong>Green Spaces of Lugano — View B prototype (phase 3)</strong>
  </div>
  <div class="network-stage" id="stage"></div>
`;

const stage = document.getElementById("stage") as HTMLDivElement;

(async () => {
  const res = await fetch("/data/parks.json");
  const data: ParksData = await res.json();

  // Render the largest park (Ciani) at default settings.
  const park = data.parks[0];

  const { width, height } = stage.getBoundingClientRect();
  const w = Math.max(800, width);
  const h = Math.max(600, height);

  const { nodes, edges } = runLayout(park.nodes, park.edges, w, h);
  renderNetwork(stage, nodes, edges, w, h);

  console.log(
    `Rendered ${park.name}: ${nodes.length} nodes, ${edges.length} edges, ` +
      `canvas ${w.toFixed(0)} × ${h.toFixed(0)}`,
  );
})();
