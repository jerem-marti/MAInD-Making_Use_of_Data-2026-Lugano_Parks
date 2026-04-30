import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Returns a 0..1 number representing how far we've scrolled through a
 * pinned scrolly-telling section.
 *
 * Convention used here: the ref points at the OUTER tall container
 * (height = N viewport heights) that contains a position:sticky inner
 * panel. As the user scrolls, the outer container's top moves from 0
 * (just entered) to -(scrollHeight - viewportHeight) (about to exit).
 *
 *   progress = clamp((-rect.top) / (rect.height - viewport), 0, 1)
 *
 * Returns exactly 0 before the section is reached and exactly 1 after
 * it has been passed.
 *
 * Updates immediately on scroll/resize, then settles once more on the next
 * animation frame to catch browser scroll restoration and layout changes.
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      rafRef.current = null;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      const total = rect.height - viewport;
      if (total <= 0) {
        setProgress(rect.bottom < 0 ? 1 : rect.top > 0 ? 0 : 0);
        return;
      }
      const raw = -rect.top / total;
      const clamped = raw <= 0 ? 0 : raw >= 1 ? 1 : raw;
      setProgress(clamped);
    };

    const onScroll = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      compute();
      rafRef.current = requestAnimationFrame(compute);
    };

    compute();
    const restoreTimer = window.setTimeout(onScroll, 120);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("pageshow", onScroll);
    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pageshow", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [ref]);

  return progress;
}
