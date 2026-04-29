import { useScrollProgressValue } from "../shared/ScrollSection";

export function Beat05WorkedExample() {
  const progress = useScrollProgressValue();
  return (
    <div className="beat-placeholder">
      <span className="label">Beat 05</span>
      <h2>Worked example</h2>
      <span className="progress">progress {progress.toFixed(2)}</span>
    </div>
  );
}
