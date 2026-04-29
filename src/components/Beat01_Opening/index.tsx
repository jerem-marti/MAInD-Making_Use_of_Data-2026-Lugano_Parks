import { useScrollProgressValue } from "../shared/ScrollSection";

export function Beat01Opening() {
  const progress = useScrollProgressValue();
  return (
    <div className="beat-placeholder">
      <span className="label">Beat 01</span>
      <h2>Opening</h2>
      <span className="progress">progress {progress.toFixed(2)}</span>
    </div>
  );
}
