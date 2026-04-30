import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import parksData from "../../data/parks.json";
import { CATEGORY_TOKENS, CATEGORY_LABELS, type Category } from "../../data/types";
import { useActII } from "../../state/ActIIContext";
import "../CompareView/CompareView.css";
import styles from "./FeedbackView.module.css";

// ---------------------------------------------------------------------------
// Keyword dictionary — built once from all parks' word networks
// ---------------------------------------------------------------------------

type Token = { text: string; category: Category | null };

const WORD_DICT: Map<string, Category> = (() => {
  const map = new Map<string, Category>();
  for (const park of (parksData as any).parks) {
    for (const node of park.wordNetwork.nodes) {
      const key = (node.term as string).toLowerCase();
      if (!map.has(key)) map.set(key, node.category as Category);
    }
  }
  return map;
})();

const MAX_PHRASE_WORDS = Math.max(
  ...Array.from(WORD_DICT.keys()).map((k) => k.split(" ").length),
);

// ---------------------------------------------------------------------------
// Tokeniser — greedy longest-match forward scan
// ---------------------------------------------------------------------------

function cleanWord(word: string): string {
  return word.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

function tokenize(input: string): Token[] {
  const words = input.trim().split(/\s+/);
  const tokens: Token[] = [];
  let i = 0;
  while (i < words.length) {
    let matched = false;
    for (let len = Math.min(MAX_PHRASE_WORDS, words.length - i); len >= 1; len--) {
      const phrase = words.slice(i, i + len).map(cleanWord).join(" ");
      const category = WORD_DICT.get(phrase) ?? null;
      if (category) {
        tokens.push({ text: words.slice(i, i + len).join(" "), category });
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ text: words[i]!, category: null });
      i++;
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeedbackView() {
  const {
    actions: { closeFeedback },
  } = useActII();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const shouldReturnFocusRef = useRef(true);
  const exitTimerRef = useRef<number | null>(null);
  const [closing, setClosing] = useState(false);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"input" | "result">("input");
  const [tokens, setTokens] = useState<Token[]>([]);

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
    const result = tokenize(text);
    setTokens(result);
    setPhase("result");
  }, [text]);

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
      if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
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
      ).filter((el) => !el.hasAttribute("disabled"));
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
    return () => window.removeEventListener("keydown", handleKeydown, { capture: true });
  }, [close]);

  // Unique categories present in the result tokens
  const foundCategories = phase === "result"
    ? ([...new Set(tokens.map((t) => t.category).filter(Boolean))] as Category[])
    : [];

  return (
    <div className={`vc-stage ${closing ? "is-closing" : ""}`}>
      <div className="map-ghost" aria-hidden="true" />
      <div
        aria-labelledby="feedback-title"
        aria-modal="true"
        className={`vc-modal ${styles.fvModal}`}
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

        <p className={`t-display-m ${styles.fvQuestion}`}>What is your ideal park?</p>

        {phase === "input" && (
          <div className={styles.inputSection}>
            <textarea
              className={styles.fvTextarea}
              placeholder="My ideal park..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className={styles.fvActions}>
              <button
                className="btn-primary"
                disabled={!text.trim()}
                onClick={handleSubmit}
                type="button"
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className={styles.resultSection}>
            <p className={styles.resultText}>
              {tokens.map((token, i) => (
                <span key={i}>
                  {token.category ? (
                    <span
                      className={styles.taggedWord}
                      style={
                        {
                          "--word-color": `var(${CATEGORY_TOKENS[token.category]})`,
                        } as CSSProperties
                      }
                    >
                      {token.text}
                    </span>
                  ) : (
                    token.text
                  )}
                  {i < tokens.length - 1 ? " " : ""}
                </span>
              ))}
            </p>

            {foundCategories.length > 0 && (
              <div className={styles.legend}>
                {foundCategories.map((cat) => (
                  <span key={cat} className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ background: `var(${CATEGORY_TOKENS[cat]})` }}
                    />
                    {CATEGORY_LABELS[cat]}
                  </span>
                ))}
              </div>
            )}

            <div className={styles.fvActions}>
              <button className="btn-primary" onClick={close} type="button">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
