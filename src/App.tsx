import { ScrollSection } from "./components/shared/ScrollSection";
import { Beat01Opening } from "./components/Beat01_Opening";
import { Beat02Method } from "./components/Beat02_Method";
import { Beat03Volume } from "./components/Beat03_Volume";
import { Beat04Lenses } from "./components/Beat04_Lenses";
import { Beat05WorkedExample } from "./components/Beat05_WorkedExample";
import { Beat06Map } from "./components/Beat06_Map";

/**
 * Act I — single-page scrolly. Each beat is pinned for `vh` viewport
 * heights of scroll while its progress runs from 0 to 1. The beat
 * implementations themselves are deliberately stub placeholders right
 * now; this scaffold exists to verify the scrolling structure.
 */
export default function App() {
  return (
    <main>
      <ScrollSection vh={1.6} id="beat-01" label="Beat 01 — Opening">
        <Beat01Opening />
      </ScrollSection>
      <ScrollSection vh={1.5} id="beat-02" label="Beat 02 — Method">
        <Beat02Method />
      </ScrollSection>
      <ScrollSection vh={1.5} id="beat-03" label="Beat 03 — Volume">
        <Beat03Volume />
      </ScrollSection>
      <ScrollSection vh={5} id="beat-04" label="Beat 04 — Lenses">
        <Beat04Lenses />
      </ScrollSection>
      <ScrollSection vh={2} id="beat-05" label="Beat 05 — Worked example">
        <Beat05WorkedExample />
      </ScrollSection>
      <ScrollSection vh={2} id="beat-06" label="Beat 06 — Map">
        <Beat06Map />
      </ScrollSection>
    </main>
  );
}
