import { useActII } from "../../state/ActIIContext";
import { ParkHeader } from "./ParkHeader";
import { WordNetwork } from "./WordNetwork";
import styles from "./ParkView.module.css";

export type ParkViewTransition = "enter" | "cycle" | "steady";

export function ParkView({
  onBackToMap,
  transition = "steady",
}: {
  onBackToMap?: () => void;
  transition?: ParkViewTransition;
}) {
  const {
    state: { selectedParkId },
  } = useActII();

  return (
    <main className={styles.view} data-transition={transition}>
      <ParkHeader onBackToMap={onBackToMap} transition={transition} />
      <div className={styles.canvas}>
        <WordNetwork key={selectedParkId ?? "none"} />
      </div>
    </main>
  );
}
