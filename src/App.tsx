import { useEffect, useLayoutEffect } from "react";
import { ScrollSection } from "./components/shared/ScrollSection";
import { Beat01Opening } from "./components/Beat01_Opening";
import { Beat02Method } from "./components/Beat02_Method";
import { Beat04Lenses } from "./components/Beat04_Lenses";
import { Beat05WorkedExample } from "./components/Beat05_WorkedExample";
import { Beat06Map } from "./components/Beat06_Map";
import { ActIIProvider, useActII } from "./state/ActIIContext";
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
    state: { actIIView, compareOpen },
    actions: { backToMap, closeCompare, cyclePark, enterPark, openCompare },
  } = useActII();

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
        backToMap();
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
  }, [actIIView, backToMap, closeCompare, compareOpen, cyclePark]);

  if (actIIView === "park") {
    return (
      <>
        <ParkView />
        {compareOpen ? <CompareView /> : null}
      </>
    );
  }

  return (
    <>
      <main>
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
          <Beat06Map onCompareClick={openCompare} onParkClick={enterPark} />
        </ScrollSection>
      </main>
      {compareOpen ? <CompareView /> : null}
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
