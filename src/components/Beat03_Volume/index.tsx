import { useScrollProgressValue } from "../shared/ScrollSection";

export function Beat03Volume() {
  const progress = useScrollProgressValue();
  return (
    <div className="beat-placeholder">
      <span className="label">Beat 03</span>
      <h2>Volume</h2>
      <span className="progress">progress {progress.toFixed(2)}</span>
    </div>
  );
}
