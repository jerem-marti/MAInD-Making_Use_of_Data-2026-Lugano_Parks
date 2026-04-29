import { useScrollProgressValue } from "../shared/ScrollSection";

export function Beat04Lenses() {
  const progress = useScrollProgressValue();
  return (
    <div className="beat-placeholder">
      <span className="label">Beat 04</span>
      <h2>Lenses</h2>
      <span className="progress">progress {progress.toFixed(2)}</span>
    </div>
  );
}
