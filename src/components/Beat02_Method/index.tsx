import { useScrollProgressValue } from "../shared/ScrollSection";

export function Beat02Method() {
  const progress = useScrollProgressValue();
  return (
    <div className="beat-placeholder">
      <span className="label">Beat 02</span>
      <h2>Method</h2>
      <span className="progress">progress {progress.toFixed(2)}</span>
    </div>
  );
}
