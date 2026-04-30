import { useMemo } from "react";
import parksData from "../../data/parks.json";
import { Blob, type BlobWeights } from "../../components/shared/Blob";
import {
  CATEGORY_TO_LENS,
  LENSES,
} from "../../components/shared/LensSwatch";
import { useActII } from "../../state/ActIIContext";
import styles from "./ParkHeader.module.css";

function toBlobWeights(categoryWeights: Record<string, number>): BlobWeights {
  const weights = {} as BlobWeights;
  LENSES.forEach((lens) => {
    weights[lens] = 0;
  });

  Object.entries(categoryWeights).forEach(([category, value]) => {
    const lens = CATEGORY_TO_LENS[category];
    if (lens) weights[lens] = value;
  });

  return weights;
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

export function ParkHeader() {
  const {
    state: { selectedParkId },
    actions: { backToMap, cyclePark, openCompare },
    parkOrder,
  } = useActII();

  const park =
    parksData.parks.find((candidate) => candidate.id === selectedParkId) ??
    parksData.parks[0];
  const position = Math.max(0, parkOrder.indexOf(park.id)) + 1;
  const weights = useMemo(
    () => toBlobWeights(park.categoryWeights),
    [park.categoryWeights],
  );

  return (
    <header className={`${styles.header} ${styles.variantA}`}>
      <div className="row1">
        <a
          className="link-inline"
          href="#beat-06"
          onClick={(event) => {
            event.preventDefault();
            backToMap();
          }}
        >
          ← Back to map
        </a>
        <div className="row1-right">
          <Blob
            ariaLabel={`${park.name} aura`}
            breathing={false}
            className={styles.aura}
            colorOrder="ascending"
            seed={position * 17 + 5}
            size={40}
            weights={weights}
          />
          <button className="btn-primary" onClick={openCompare} type="button">
            Compare all five
          </button>
        </div>
      </div>
      <div className="row2">
        <div className="identity">
          <button
            aria-label="Previous park"
            className="cycle"
            onClick={() => cyclePark("previous")}
            type="button"
          >
            ‹
          </button>
          <div className="identity-meta">
            <h1 className="t-display-m park-name">{park.name}</h1>
            <div className="t-body-s">
              <span className={styles.statValue}>
                {formatCount(park.totalWords)}
              </span>{" "}
              reviewed words
              <span className="dot-sep">·</span>
              <span className={styles.statValue}>
                {formatCount(park.distinctWords)}
              </span>{" "}
              distinct words
            </div>
            <div className="t-label-s" style={{ marginTop: "var(--space-1)" }}>
              {position} of {parkOrder.length}
            </div>
          </div>
          <button
            aria-label="Next park"
            className="cycle"
            onClick={() => cyclePark("next")}
            type="button"
          >
            ›
          </button>
        </div>
      </div>
    </header>
  );
}
