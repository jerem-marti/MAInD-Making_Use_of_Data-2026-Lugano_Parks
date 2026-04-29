import {
  createContext,
  useContext,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useScrollProgress } from "../../hooks/useScrollProgress";
import styles from "./ScrollSection.module.css";

/**
 * A pinned scrolly-telling container.
 *
 * Two ways to consume the 0..1 progress value:
 *   1. Children can read it via the ScrollProgressContext / useScrollProgressValue hook.
 *   2. Or pass `children` as a render prop: ({ progress }) => ReactNode.
 *
 * Layout: an outer container N × 100vh tall, with a position:sticky inner
 * panel that fills one viewport. As the user scrolls, the panel stays
 * pinned while the outer container scrolls past, giving us a stable
 * stage to choreograph against `progress`.
 */
type RenderProp = (api: { progress: number }) => ReactNode;

export type ScrollSectionProps = {
  /** How many viewport heights of scroll the pin should consume. Default: 2. */
  vh?: number;
  /** Optional id for anchor links / debugging. */
  id?: string;
  /** Accessible label for the pinned region. */
  label?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode | RenderProp;
};

const ScrollProgressContext = createContext<number>(0);

export function useScrollProgressValue(): number {
  return useContext(ScrollProgressContext);
}

export function ScrollSection({
  vh = 2,
  id,
  label,
  className,
  style,
  children,
}: ScrollSectionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progress = useScrollProgress(containerRef);

  const outerStyle: CSSProperties = {
    height: `${vh * 100}vh`,
    ...style,
  };

  return (
    <section
      ref={containerRef}
      id={id}
      aria-label={label}
      className={[styles.outer, className].filter(Boolean).join(" ")}
      style={outerStyle}
      data-progress={progress.toFixed(3)}
    >
      <div className={styles.sticky}>
        <ScrollProgressContext.Provider value={progress}>
          {typeof children === "function"
            ? (children as RenderProp)({ progress })
            : children}
        </ScrollProgressContext.Provider>
      </div>
    </section>
  );
}
