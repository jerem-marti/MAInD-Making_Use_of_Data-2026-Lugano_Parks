import { useScrollProgressValue } from "../shared/ScrollSection";

export function Beat06Map() {
  const progress = useScrollProgressValue();
  return (
    <div className="beat-placeholder">
      <span className="label">Beat 06</span>
      <h2>Map</h2>
      <span className="progress">progress {progress.toFixed(2)}</span>
    </div>
  );
}
