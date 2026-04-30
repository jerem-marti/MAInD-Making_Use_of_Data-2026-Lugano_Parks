import { useActII } from "../../state/ActIIContext";
import { ParkHeader } from "./ParkHeader";
import { WordNetwork } from "./WordNetwork";
import styles from "./ParkView.module.css";

export function ParkView() {
  const {
    state: { selectedParkId },
  } = useActII();

  return (
    <main className={styles.view}>
      <ParkHeader />
      <div className={styles.canvas}>
        <WordNetwork key={selectedParkId ?? "none"} />
      </div>
    </main>
  );
}
