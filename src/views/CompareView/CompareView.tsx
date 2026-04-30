import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import parksData from "../../data/parks.json";
import {
  CATEGORIES,
  CATEGORY_TOKENS,
  type Category,
  type WordNetworkNode,
} from "../../data/types";
import {
  CATEGORY_TO_LENS,
  LENSES,
  type Lens,
} from "../../components/shared/LensSwatch";
import {
  Blob,
  type BlobWeights,
} from "../../components/shared/Blob";
import { useActII } from "../../state/ActIIContext";
import "./CompareView.css";

type TopTerm = {
  term: string;
  category: Category;
  frequency: number;
};

type ComparePark = {
  id: string;
  name: string;
  totalWords: number;
  categoryWeights: Record<Category, number>;
  topTerms?: TopTerm[];
  wordNetwork?: {
    nodes: WordNetworkNode[];
  };
};

const PARK_ORDER = [
  "ciani",
  "tassino",
  "san-michele",
  "paradiso",
  "lambertenghi",
];

const LENS_NAMES: Record<Category, string> = {
  experiential_emotional: "emotional",
  sensory_environmental: "sensory",
  action: "action",
  relational_context: "relational",
  infrastructure_amenities: "infrastructure",
  tension_complaint: "tension",
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function lensColour(category: Category): string {
  return `var(${CATEGORY_TOKENS[category]})`;
}

function getParks(): ComparePark[] {
  const parks = parksData.parks as ComparePark[];
  return PARK_ORDER.map((parkId) => parks.find((park) => park.id === parkId))
    .filter((park): park is ComparePark => Boolean(park));
}

function dominantCategory(weights: Record<Category, number>): Category {
  return CATEGORIES.reduce((best, category) => {
    return (weights[category] ?? 0) > (weights[best] ?? 0) ? category : best;
  }, CATEGORIES[0]);
}

function topWords(park: ComparePark): string[] {
  if (park.topTerms?.length) {
    return park.topTerms.slice(0, 3).map((term) => term.term);
  }

  return [...(park.wordNetwork?.nodes ?? [])]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 3)
    .map((node) => node.term);
}

function emptyBlobWeights(): BlobWeights {
  return LENSES.reduce((weights, lens) => {
    weights[lens] = 0;
    return weights;
  }, {} as BlobWeights);
}

function weightsForBlob(categoryWeights: Record<Category, number>): BlobWeights {
  const weights = emptyBlobWeights();
  CATEGORIES.forEach((category) => {
    const lens = CATEGORY_TO_LENS[category] as Lens;
    weights[lens] = categoryWeights[category] ?? 0;
  });
  return weights;
}

function isActivationKey(event: KeyboardEvent): boolean {
  return event.key === "Enter" || event.key === " ";
}

export function CompareView() {
  const {
    actions: { closeCompare, enterPark },
  } = useActII();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const shouldReturnFocusRef = useRef(true);
  const parks = useMemo(getParks, []);
  const maxWords = parks[0]?.totalWords ?? 1;

  const close = useCallback(() => {
    shouldReturnFocusRef.current = true;
    closeCompare();
  }, [closeCompare]);

  const enterComparedPark = useCallback(
    (parkId: string) => {
      shouldReturnFocusRef.current = false;
      closeCompare();
      enterPark(parkId);
    },
    [closeCompare, enterPark],
  );

  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      if (!shouldReturnFocusRef.current) return;
      returnFocusRef.current?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const handleKeydown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        close();
        return;
      }

      if (event.key !== "Tab") return;
      const modal = modalRef.current;
      if (!modal) return;

      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeydown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeydown, { capture: true });
    };
  }, [close]);

  return (
    <div className="vc-stage">
      <div className="map-ghost" aria-hidden="true" />
      <div
        aria-describedby="compare-subtitle"
        aria-labelledby="compare-title"
        aria-modal="true"
        className="vc-modal gen"
        ref={modalRef}
        role="dialog"
      >
        <button
          aria-label="Close compare"
          className="vc-close"
          onClick={close}
          ref={closeButtonRef}
          type="button"
        >
          {"\u00d7"}
        </button>

        <div className="vc-head">
          <div className="t-label label-line" id="compare-title">
            All five auras, side by side
          </div>
        </div>

        <div className="stations">
          {parks.map((park, index) => (
            <Station
              barWidth={(park.totalWords / maxWords) * 100}
              key={park.id}
              onEnterPark={enterComparedPark}
              park={park}
              seed={index * 17 + 5}
            />
          ))}
        </div>

        <p className="t-label-s vc-note" id="compare-subtitle">
          * Sized equally on purpose. With volume removed, only the colours speak.
        </p>
      </div>
    </div>
  );
}

function Station({
  barWidth,
  onEnterPark,
  park,
  seed,
}: {
  barWidth: number;
  onEnterPark: (parkId: string) => void;
  park: ComparePark;
  seed: number;
}) {
  const dominant = dominantCategory(park.categoryWeights);
  const words = topWords(park);

  const style = {
    "--dominant-color": lensColour(dominant),
    "--microbar-width": `${barWidth}%`,
  } as CSSProperties;

  return (
    <div
      aria-label={`Open ${park.name}`}
      className="station"
      onClick={() => onEnterPark(park.id)}
      onKeyDown={(event) => {
        if (!isActivationKey(event)) return;
        event.preventDefault();
        onEnterPark(park.id);
      }}
      role="button"
      style={style}
      tabIndex={0}
    >
      <div className="microbar-block">
        <div className="microbar" style={{ width: "var(--microbar-width)" }} />
        <div className="t-label-s microbar-count">
          {park.totalWords.toLocaleString("en-US")} words
        </div>
      </div>

      <div className="vc-aura" aria-label={`${park.name} aura`}>
        <Blob
          ariaLabel={`${park.name} aura`}
          breathing
          colorOrder="ascending"
          seed={seed}
          size={180}
          weights={weightsForBlob(park.categoryWeights)}
        />
      </div>

      <div className="station-meta">
        <h3 className="t-display-m station-name">{park.name}</h3>

        <div className="station-block">
          <div className="t-label label-line">Top words</div>
          <div className="top-words">
            {words.map((word) => (
              <span className="w" key={word}>
                {word}
              </span>
            ))}
          </div>
        </div>

        <div className="station-block">
          <div className="t-label label-line">Dominant lens</div>
          <span className="tag-pill">
            <span
              className="dot"
              style={{ background: lensColour(dominant) }}
              aria-hidden="true"
            />
            {LENS_NAMES[dominant]}
          </span>
        </div>
      </div>
    </div>
  );
}
