import { useCallback, useEffect, useRef, useState } from "react";
import { useActII } from "../../state/ActIIContext";
import "../CompareView/CompareView.css";
import "./FeedbackView.css";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function FeedbackView() {
  const {
    actions: { closeFeedback },
  } = useActII();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const shouldReturnFocusRef = useRef(true);
  const exitTimerRef = useRef<number | null>(null);
  const submitTimerRef = useRef<number | null>(null);
  const [closing, setClosing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const scheduleExit = useCallback((afterExit: () => void) => {
    if (exitTimerRef.current !== null) return;
    if (prefersReducedMotion()) {
      afterExit();
      return;
    }

    setClosing(true);
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      afterExit();
    }, 220);
  }, []);

  const close = useCallback(() => {
    shouldReturnFocusRef.current = true;
    scheduleExit(closeFeedback);
  }, [closeFeedback, scheduleExit]);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    submitTimerRef.current = window.setTimeout(() => {
      submitTimerRef.current = null;
      scheduleExit(closeFeedback);
    }, 1200);
  }, [submitted, scheduleExit, closeFeedback]);

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
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
      if (submitTimerRef.current !== null) {
        window.clearTimeout(submitTimerRef.current);
      }
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
    <div className={`vc-stage ${closing ? "is-closing" : ""}`}>
      <div className="map-ghost" aria-hidden="true" />
      <div
        aria-labelledby="feedback-title"
        aria-modal="true"
        className="vc-modal fv-modal"
        ref={modalRef}
        role="dialog"
      >
        <button
          aria-label="Close feedback"
          className="vc-close"
          onClick={close}
          ref={closeButtonRef}
          type="button"
        >
          {"×"}
        </button>

        <div className="vc-head">
          <div className="t-label" id="feedback-title">
            Tell us how you feel
          </div>
        </div>

        <p className="t-display-m fv-question">What is your ideal park?</p>

        <textarea
          className="fv-textarea"
          placeholder="My ideal park..."
        />

        <div className="fv-actions">
          <button
            className="btn-primary"
            disabled={submitted}
            onClick={handleSubmit}
            type="button"
          >
            {submitted ? "Submitted" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
