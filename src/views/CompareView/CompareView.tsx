import { useActII } from "../../state/ActIIContext";

export function CompareView() {
  const {
    actions: { closeCompare },
  } = useActII();

  return (
    <div
      aria-modal="true"
      role="dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        padding: "var(--space-6)",
        background: "rgba(26, 26, 26, 0.32)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(520px, 100%)",
          padding: "var(--space-7)",
          border: "0.5px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          background: "var(--color-bg)",
          color: "var(--color-text-primary)",
          textAlign: "center",
        }}
      >
        <button
          aria-label="Close compare"
          onClick={closeCompare}
          type="button"
          style={{
            position: "absolute",
            top: "var(--space-3)",
            right: "var(--space-3)",
            width: 40,
            height: 40,
            display: "grid",
            placeItems: "center",
            border: 0,
            background: "transparent",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 24,
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <p className="t-display-m" style={{ margin: 0 }}>
          View C placeholder
        </p>
      </div>
    </div>
  );
}
