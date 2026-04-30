import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ScrollSection } from "./components/shared/ScrollSection";
import { Beat01Opening } from "./components/Beat01_Opening";
import { Beat02Method } from "./components/Beat02_Method";
import { Beat04Lenses } from "./components/Beat04_Lenses";
import { Beat05WorkedExample } from "./components/Beat05_WorkedExample";
import { Beat06Map } from "./components/Beat06_Map";
import type {
  MarkerScreenPosition,
  MarkerTransitionSource,
} from "./components/Beat06_Map/MapLibreMap";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { ActIIProvider, useActII } from "./state/ActIIContext";
import {
  ActIIChoreography,
  type ActIIChoreographyMode,
  type ChoreographyRect,
} from "./transitions/ActIIChoreography";
import { ParkView } from "./views/ParkView/ParkView";
import { CompareView } from "./views/CompareView/CompareView";

/**
 * Act I — single-page scrolly. Each beat is pinned for `vh` viewport
 * heights of scroll while its progress runs from 0 to 1. The beat
 * implementations themselves are deliberately stub placeholders right
 * now; this scaffold exists to verify the scrolling structure.
 */
function shouldIgnoreKeydown(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function AppShell() {
  const {
    state: { actIIView, compareOpen, selectedParkId },
    actions: { backToMap, closeCompare, cyclePark, enterPark, openCompare },
  } = useActII();
  const previousViewRef = useRef(actIIView);
  const previousParkRef = useRef(selectedParkId);
  const markerPositionsRef = useRef<Record<string, MarkerScreenPosition>>({});
  const transitionTimersRef = useRef<number[]>([]);
  const reducedMotion = useReducedMotion();
  const [choreography, setChoreography] = useState<{
    mode: ActIIChoreographyMode;
    parkId: string;
    sourceRect?: ChoreographyRect;
    targetRect?: ChoreographyRect;
  } | null>(null);
  const previousView = previousViewRef.current;
  const previousPark = previousParkRef.current;
  const routeTransition =
    previousView === actIIView ? "steady" : `${previousView}-to-${actIIView}`;
  const parkTransition =
    actIIView === "park" && previousView === "park" && previousPark !== selectedParkId
      ? "cycle"
      : routeTransition === "map-to-park"
        ? "enter"
        : "steady";

  useEffect(() => {
    previousViewRef.current = actIIView;
    previousParkRef.current = selectedParkId;
  }, [actIIView, selectedParkId]);

  useEffect(() => {
    return () => {
      transitionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const clearTransitionTimers = useCallback(() => {
    transitionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    transitionTimersRef.current = [];
  }, []);

  const scheduleTransition = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    transitionTimersRef.current.push(timer);
  }, []);

  const markerRectForPark = useCallback((parkId: string): ChoreographyRect | undefined => {
    const marker = markerPositionsRef.current[parkId];
    if (!marker) return undefined;

    return {
      left: marker.x - marker.diameter / 2,
      top: marker.y - marker.diameter / 2,
      width: marker.diameter,
      height: marker.diameter,
    };
  }, []);

  const handleMarkerPositionsChange = useCallback(
    (positions: Record<string, MarkerScreenPosition>) => {
      markerPositionsRef.current = positions;
    },
    [],
  );

  const enterParkWithChoreography = useCallback(
    (parkId: string, source?: MarkerTransitionSource | ChoreographyRect) => {
      clearTransitionTimers();

      if (reducedMotion) {
        enterPark(parkId);
        return;
      }

      setChoreography({
        mode: "to-park",
        parkId,
        sourceRect: source,
      });
      enterPark(parkId);
      scheduleTransition(() => setChoreography(null), 1940);
    },
    [clearTransitionTimers, enterPark, reducedMotion, scheduleTransition],
  );

  const backToMapWithChoreography = useCallback(() => {
    const parkId = selectedParkId;
    clearTransitionTimers();

    if (!parkId || reducedMotion) {
      backToMap();
      return;
    }

    setChoreography({
      mode: "to-map",
      parkId,
      targetRect: markerRectForPark(parkId),
    });
    scheduleTransition(backToMap, 720);
    scheduleTransition(() => setChoreography(null), 1100);
  }, [
    backToMap,
    clearTransitionTimers,
    markerRectForPark,
    reducedMotion,
    scheduleTransition,
    selectedParkId,
  ]);

  useLayoutEffect(() => {
    if (actIIView === "park") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [actIIView]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeydown(event)) return;

      if (event.key === "Escape" && compareOpen) {
        event.preventDefault();
        closeCompare();
        return;
      }

      if (actIIView !== "park" || compareOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        backToMapWithChoreography();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        cyclePark("previous");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        cyclePark("next");
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [
    actIIView,
    backToMapWithChoreography,
    closeCompare,
    compareOpen,
    cyclePark,
  ]);

  if (actIIView === "park") {
    return (
      <>
        <div
          className="act-route act-route--park"
          data-choreography={choreography?.mode ?? "none"}
          data-transition={routeTransition}
        >
          <ParkView
            onBackToMap={backToMapWithChoreography}
            transition={parkTransition}
          />
        </div>
        {compareOpen ? (
          <CompareView onEnterPark={enterParkWithChoreography} />
        ) : null}
        {choreography ? <ActIIChoreography {...choreography} /> : null}
      </>
    );
  }

  return (
    <>
      <main
        className="act-route act-route--map"
        data-transition={routeTransition}
      >
        <ScrollSection vh={1.6} id="beat-01" label="Beat 01 — Opening">
          <Beat01Opening />
        </ScrollSection>
        <ScrollSection vh={1.5} id="beat-02" label="Beat 02 — Method">
          <Beat02Method />
        </ScrollSection>
        <ScrollSection vh={5} id="beat-04" label="Beat 04 — Lenses">
          <Beat04Lenses />
        </ScrollSection>
        <ScrollSection vh={6} id="beat-05" label="Beat 05 — Worked example">
          <Beat05WorkedExample />
        </ScrollSection>
        <ScrollSection vh={4} id="beat-06" label="Beat 06 — Map">
          <Beat06Map
            onCompareClick={openCompare}
            onMarkerPositionsChange={handleMarkerPositionsChange}
            onParkClick={enterParkWithChoreography}
          />
        </ScrollSection>
      </main>
      {compareOpen ? (
        <CompareView onEnterPark={enterParkWithChoreography} />
      ) : null}
      {choreography ? <ActIIChoreography {...choreography} /> : null}
    </>
  );
}

export default function App() {
  return (
    <ActIIProvider>
      <AppShell />
    </ActIIProvider>
  );
}
