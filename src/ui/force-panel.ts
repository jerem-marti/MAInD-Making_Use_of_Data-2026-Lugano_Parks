import {
  DEFAULT_FORCE_PARAMS,
  type ForceParams,
} from "../network/layout";

/**
 * Floating debug panel: four sliders for cluster strength, charge
 * strength, edge strength, edge distance. Re-running the simulation is
 * expensive enough (synchronous convergence on ~100 nodes) that we
 * trigger it on input change but debounce a tiny amount.
 */
type Slider = {
  key: keyof ForceParams;
  label: string;
  min: number;
  max: number;
  step: number;
};

const SLIDERS: Slider[] = [
  { key: "clusterStrength", label: "Cluster strength", min: 0,    max: 0.5,  step: 0.005 },
  { key: "chargeStrength",  label: "Charge strength",  min: 0,    max: 100,  step: 1 },
  { key: "edgeStrength",    label: "Edge strength",    min: 0,    max: 0.5,  step: 0.005 },
  { key: "edgeDistance",    label: "Edge distance",    min: 10,   max: 200,  step: 1 },
];

export function mountForcePanel(
  root: HTMLElement,
  initial: ForceParams,
  onChange: (next: ForceParams) => void,
): { setValues(p: ForceParams): void } {
  root.className = "force-panel";
  root.innerHTML = `<h3>Force tuning</h3>`;

  const current: ForceParams = { ...initial };
  const inputs: Record<keyof ForceParams, HTMLInputElement> = {} as never;
  const valueLabels: Record<keyof ForceParams, HTMLSpanElement> = {} as never;

  for (const s of SLIDERS) {
    const wrap = document.createElement("div");
    wrap.className = "control";
    wrap.innerHTML = `
      <div class="control-row">
        <span>${s.label}</span>
        <span class="value"></span>
      </div>
      <input type="range" min="${s.min}" max="${s.max}" step="${s.step}" />
    `;
    root.appendChild(wrap);
    const input = wrap.querySelector<HTMLInputElement>("input")!;
    const valueLabel = wrap.querySelector<HTMLSpanElement>(".value")!;
    input.value = String(current[s.key]);
    valueLabel.textContent = formatValue(current[s.key], s.step);

    let timer: ReturnType<typeof setTimeout> | null = null;
    input.addEventListener("input", () => {
      const v = Number(input.value);
      current[s.key] = v;
      valueLabel.textContent = formatValue(v, s.step);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChange({ ...current }), 80);
    });

    inputs[s.key] = input;
    valueLabels[s.key] = valueLabel;
  }

  const reset = document.createElement("button");
  reset.className = "btn-primary";
  reset.textContent = "Reset to defaults";
  reset.addEventListener("click", () => {
    Object.assign(current, DEFAULT_FORCE_PARAMS);
    for (const s of SLIDERS) {
      inputs[s.key].value = String(current[s.key]);
      valueLabels[s.key].textContent = formatValue(current[s.key], s.step);
    }
    onChange({ ...current });
  });
  root.appendChild(reset);

  return {
    setValues(p: ForceParams) {
      Object.assign(current, p);
      for (const s of SLIDERS) {
        inputs[s.key].value = String(p[s.key]);
        valueLabels[s.key].textContent = formatValue(p[s.key], s.step);
      }
    },
  };
}

function formatValue(v: number, step: number): string {
  if (step >= 1) return v.toFixed(0);
  if (step >= 0.1) return v.toFixed(1);
  if (step >= 0.01) return v.toFixed(2);
  return v.toFixed(3);
}
