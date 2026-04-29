import * as XLSX from "xlsx";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import {
  CATEGORIES,
  type Category,
  type CategoryCounts,
  type Edge,
  type Node,
  type Park,
  type ParksData,
} from "../src/data/types";

const SRC = "data/parks_analysis_V2.xlsx";
const OUT = "public/data/parks.json";
const SHEET = "parks_analysis_update";

type Row = {
  park_name: string;
  category: string;
  term: string;
  frequency: number;
  occurrence_number: number;
  context_excerpt: string | null;
  [key: `co_occurring_term_${number}`]: string | null;
  [key: `co_occurring_category_${number}`]: string | null;
};

const COOC_SLOTS = [1, 2, 3, 4, 5, 6, 7] as const;

function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}

function isMissing(v: unknown): boolean {
  // Pandas exports NaN as the literal string "nan" in the workbook.
  if (v === null || v === undefined) return true;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    return t === "" || t === "nan" || t === "none";
  }
  if (typeof v === "number" && Number.isNaN(v)) return true;
  return false;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function emptyCounts(): CategoryCounts {
  return CATEGORIES.reduce(
    (acc, c) => ((acc[c] = 0), acc),
    {} as CategoryCounts,
  );
}

// ─────────────────────────────────────────────────────────────────────
// Read sheet
// ─────────────────────────────────────────────────────────────────────

const buf = readFileSync(SRC);
const wb = XLSX.read(buf, { type: "buffer" });
const ws = wb.Sheets[SHEET];
if (!ws) throw new Error(`Expected sheet "${SHEET}" in ${SRC}`);
const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: null });

console.log(`Loaded ${rows.length} rows from ${SRC}`);

// ─────────────────────────────────────────────────────────────────────
// First pass: group by park, dedupe nodes by term
// ─────────────────────────────────────────────────────────────────────

type ParkAcc = {
  name: string;
  nodes: Map<string, Node>;
  edges: Map<string, Edge>; // key: `${a}␟${b}` with a < b
};

const parks = new Map<string, ParkAcc>();
let unknownCategoryCount = 0;
let nanCoocCount = 0;

// Frequency = row count per (park, term). The `frequency` column in the
// xlsx is unreliable (Parco Tassino was the result of merging two parks
// and its frequency values weren't recomputed), so we count rows instead.
// Row count matches the `frequency` column for the four clean parks.
for (const row of rows) {
  const parkName = row.park_name;
  const term = row.term;
  if (!parkName || !term) continue;

  if (!isCategory(row.category)) {
    unknownCategoryCount++;
    continue;
  }
  const cat: Category = row.category;

  let acc = parks.get(parkName);
  if (!acc) {
    acc = { name: parkName, nodes: new Map(), edges: new Map() };
    parks.set(parkName, acc);
  }

  const existingNode = acc.nodes.get(term);
  if (existingNode) {
    existingNode.frequency += 1;
  } else {
    acc.nodes.set(term, {
      term,
      category: cat,
      frequency: 1,
      exampleExcerpt: (row.context_excerpt ?? "").toString(),
    });
  }

  // Edges from co_occurring_term_* on this row.
  for (const slot of COOC_SLOTS) {
    const partner = row[`co_occurring_term_${slot}`];
    if (isMissing(partner)) {
      if (typeof partner === "string" && partner.trim().toLowerCase() === "nan")
        nanCoocCount++;
      continue;
    }
    if (typeof partner !== "string" || partner === term) continue;

    const a = term < partner ? term : partner;
    const b = term < partner ? partner : term;
    const key = `${a}␟${b}`;
    const existing = acc.edges.get(key);
    if (existing) existing.weight += 1;
    else acc.edges.set(key, { source: a, target: b, weight: 1 });
  }
}

// ─────────────────────────────────────────────────────────────────────
// Second pass: filter edges with missing endpoints, build Park[]
// ─────────────────────────────────────────────────────────────────────

const result: ParksData = { parks: [] };
let droppedDanglingEdges = 0;
let totalEdges = 0;

for (const [parkName, acc] of parks) {
  const termSet = new Set(acc.nodes.keys());
  const validEdges: Edge[] = [];
  for (const edge of acc.edges.values()) {
    if (!termSet.has(edge.source) || !termSet.has(edge.target)) {
      droppedDanglingEdges++;
      continue;
    }
    validEdges.push(edge);
  }

  const nodes = [...acc.nodes.values()].sort(
    (a, b) => b.frequency - a.frequency || a.term.localeCompare(b.term),
  );

  const categoryCounts = emptyCounts();
  let totalMentions = 0;
  for (const n of nodes) {
    categoryCounts[n.category] += n.frequency;
    totalMentions += n.frequency;
  }

  const park: Park = {
    id: slugify(parkName),
    name: parkName,
    totalMentions,
    distinctTermsCount: nodes.length,
    categoryCounts,
    nodes,
    edges: validEdges,
  };
  result.parks.push(park);
  totalEdges += validEdges.length;
}

// Stable park order: by totalMentions descending (largest first), then name.
result.parks.sort(
  (a, b) => b.totalMentions - a.totalMentions || a.name.localeCompare(b.name),
);

// ─────────────────────────────────────────────────────────────────────
// Write output
// ─────────────────────────────────────────────────────────────────────

const outDir = dirname(OUT);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(OUT, JSON.stringify(result, null, 2));

// ─────────────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────────────

console.log("");
console.log(`Parks: ${result.parks.length}`);
for (const p of result.parks) {
  console.log(
    `  ${p.name.padEnd(28)} id=${p.id.padEnd(24)} ` +
      `terms=${String(p.distinctTermsCount).padStart(3)} ` +
      `mentions=${String(p.totalMentions).padStart(5)} ` +
      `edges=${String(p.edges.length).padStart(4)}`,
  );
}
console.log(`Total edges across all parks: ${totalEdges}`);

console.log("");
console.log("Anomalies (logged, not silently fixed):");
console.log(
  `  rows with unknown category (skipped): ${unknownCategoryCount}`,
);
console.log(
  `  co-occurring slots with literal "nan" string (treated as missing): ${nanCoocCount}`,
);
console.log(
  `  edges dropped because an endpoint wasn't in the park's node list: ${droppedDanglingEdges}`,
);

console.log("");
console.log(`Wrote ${OUT}`);
