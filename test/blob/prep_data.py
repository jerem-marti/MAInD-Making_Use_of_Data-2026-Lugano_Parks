"""
Phase 1 data prep: compute per-park 6-category weights from parks_analysis_V2.xlsx.

Method (per brief):
  - For each park, take all UNIQUE terms (deduplicate by term within park).
  - Sum each term's frequency, grouped by category.
  - Normalise so the 6 category values sum to 1.0.

Emits: data/parks.json
Run once after the xlsx changes; the runtime page reads only the JSON.
"""
import json
from collections import defaultdict
from pathlib import Path

import openpyxl

XLSX = Path(r"D:\OneDrive\Etudes\SUPSI\MAIND-S2\make_use_of_data\parks_analysis_V2.xlsx")
OUT = Path(__file__).parent / "data" / "parks.json"

# Canonical 6 categories, ordered. snake_case matches the xlsx values.
CATEGORIES = [
    "experiential_emotional",
    "sensory_environmental",
    "action",
    "relational_context",
    "infrastructure_amenities",
    "tension_complaint",
]

# Display order requested by the brief (Tension last in narrative, but for
# the chart the canonical order above is what the renderer uses).
DISPLAY_LABELS = {
    "experiential_emotional": "Emotional",
    "sensory_environmental": "Sensory",
    "action": "Action",
    "relational_context": "Relational",
    "infrastructure_amenities": "Infrastructure",
    "tension_complaint": "Tension",
}


def compute() -> dict:
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb["parks_analysis_update"]
    rows = ws.iter_rows(values_only=True)
    header = next(rows)
    idx = {name: i for i, name in enumerate(header)}

    # park -> term -> (category, frequency); dedupe by term within park.
    park_terms: dict[str, dict[str, tuple[str, float]]] = defaultdict(dict)
    park_review_counts: dict[str, set] = defaultdict(set)

    for row in rows:
        if row is None or row[idx["park_name"]] is None:
            continue
        park = str(row[idx["park_name"]]).strip()
        term = row[idx["term"]]
        category = row[idx["category"]]
        freq = row[idx["frequency"]]
        occ = row[idx["occurrence_number"]]
        if term is None or category is None or freq is None:
            continue
        term = str(term).strip().lower()
        category = str(category).strip()
        if category not in CATEGORIES:
            continue
        try:
            freq = float(freq)
        except (TypeError, ValueError):
            continue
        # Dedupe by term: first sighting wins (frequency is per-term anyway).
        if term not in park_terms[park]:
            park_terms[park][term] = (category, freq)
        # Track unique occurrences as a rough review-count proxy.
        if occ is not None:
            park_review_counts[park].add((term, occ))

    parks_out = []
    for park, terms in sorted(park_terms.items()):
        sums = {c: 0.0 for c in CATEGORIES}
        for _term, (cat, f) in terms.items():
            sums[cat] += f
        total = sum(sums.values())
        weights = {c: (sums[c] / total if total > 0 else 0.0) for c in CATEGORIES}
        parks_out.append({
            "name": park,
            "short_name": short_name(park),
            "weights": weights,
            "review_count_proxy": len(park_review_counts[park]),
            "unique_terms": len(terms),
        })

    return {
        "categories": CATEGORIES,
        "labels": DISPLAY_LABELS,
        "parks": parks_out,
    }


def short_name(full: str) -> str:
    # "Parco Ciani" -> "Ciani"; "Parco San Michele" -> "San Michele"; etc.
    s = full.strip()
    for prefix in ("Parco di ", "Parco "):
        if s.startswith(prefix):
            return s[len(prefix):]
    return s


def main() -> None:
    payload = compute()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # Print a comparison vs the brief's reference table.
    print(f"Wrote {OUT}\n")
    print(f"{'park':<24}{'Emot':>7}{'Sens':>7}{'Act':>7}{'Rel':>7}{'Infr':>7}{'Tens':>7}")
    for p in payload["parks"]:
        w = p["weights"]
        print(
            f"{p['short_name']:<24}"
            f"{w['experiential_emotional']:>7.2f}"
            f"{w['sensory_environmental']:>7.2f}"
            f"{w['action']:>7.2f}"
            f"{w['relational_context']:>7.2f}"
            f"{w['infrastructure_amenities']:>7.2f}"
            f"{w['tension_complaint']:>7.2f}"
        )


if __name__ == "__main__":
    main()
