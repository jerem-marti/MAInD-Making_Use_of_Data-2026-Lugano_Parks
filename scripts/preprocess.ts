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
const OUT_RICH = "public/data/parks.json"; // Phase 3 View B network shape
const OUT_ACT1 = "src/data/parks.json"; // Act I scrolly shape (per Phase 2 setup spec)
const OUT_POOL = "src/data/excerpts-pool.json"; // shared pool of short excerpts
const SHEET = "parks_analysis_update";

// Map full park name → short Act I id. The Phase 2 setup spec gave "ciani"
// as the example; we follow the same convention (drop "Parco ", lowercase,
// kebab-case, drop the descriptor "panoramico" since "paradiso" alone
// disambiguates).
const ACT1_IDS: Record<string, string> = {
  "Parco Ciani": "ciani",
  "Parco Tassino": "tassino",
  "Parco San Michele": "san-michele",
  "Parco Panoramico Paradiso": "paradiso",
  "Parco Lambertenghi": "lambertenghi",
};

const TOP_TERMS_PER_PARK = 12;
const EXAMPLE_EXCERPTS_PER_PARK = 8;
const POOL_TARGET_SIZE = 30;
const EXCERPT_MIN_WORDS = 4;
const EXCERPT_MAX_WORDS = 16;
const WORD_NETWORK_MIN_FREQUENCY = 2;

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

/**
 * The source xlsx contains UTF-8 round-trip mangles where Excel stored
 * already-encoded UTF-8 bytes as Latin-1. The pattern "√©" is the
 * mangled form of "é". Fixing here so downstream code sees the correct
 * glyph regardless of where the term appears (node label, edge endpoint,
 * tooltip excerpt).
 */
function fixMojibake(s: string): string {
  // The xlsx came through Mac-Roman → UTF-8 round-tripping. The patterns
  // below cover the cases we have so far seen in this corpus. Extending
  // the table is a deferred task: revisit when more parks / more reviews
  // are added so we can confirm the full set of artefacts before
  // committing to a mapping.
  return s
    .replace(/√©/g, "é")
    .replace(/√†/g, "à")
    .replace(/√®/g, "è")
    .replace(/√¨/g, "ì")
    .replace(/√≤/g, "ò")
    .replace(/√π/g, "ù")
    .replace(/√ß/g, "ç")
    .replace(/‚Ä¶/g, "…")
    .replace(/‚Äô/g, "’")
    .replace(/‚Äú/g, "“")
    .replace(/‚Äù/g, "”")
    .replace(/‚Äì/g, "–")
    .replace(/‚Äî/g, "—");
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
  /** Insertion-ordered, case-insensitive deduped, length-filtered. */
  excerpts: string[];
  excerptKeys: Set<string>;
};

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function normaliseExcerpt(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function excerptKey(s: string): string {
  return s.toLowerCase();
}

const parks = new Map<string, ParkAcc>();
let unknownCategoryCount = 0;
let nanCoocCount = 0;

// Frequency = row count per (park, term). The `frequency` column in the
// xlsx is unreliable (Parco Tassino was the result of merging two parks
// and its frequency values weren't recomputed), so we count rows instead.
// Row count matches the `frequency` column for the four clean parks.
let mojibakeFixCount = 0;

for (const row of rows) {
  const parkName = row.park_name;
  const rawTerm = row.term;
  if (!parkName || !rawTerm) continue;

  const term = fixMojibake(rawTerm);
  if (term !== rawTerm) mojibakeFixCount++;

  if (!isCategory(row.category)) {
    unknownCategoryCount++;
    continue;
  }
  const cat: Category = row.category;

  let acc = parks.get(parkName);
  if (!acc) {
    acc = {
      name: parkName,
      nodes: new Map(),
      edges: new Map(),
      excerpts: [],
      excerptKeys: new Set(),
    };
    parks.set(parkName, acc);
  }

  // Collect short distinct excerpts per park (used for both
  // exampleExcerpts and the cross-park pool).
  const rawExcerpt = row.context_excerpt;
  if (rawExcerpt && typeof rawExcerpt === "string") {
    const e = normaliseExcerpt(fixMojibake(rawExcerpt));
    const wc = wordCount(e);
    if (wc >= EXCERPT_MIN_WORDS && wc <= EXCERPT_MAX_WORDS) {
      const key = excerptKey(e);
      if (!acc.excerptKeys.has(key)) {
        acc.excerptKeys.add(key);
        acc.excerpts.push(e);
      }
    }
  }

  const existingNode = acc.nodes.get(term);
  if (existingNode) {
    existingNode.frequency += 1;
  } else {
    acc.nodes.set(term, {
      term,
      category: cat,
      frequency: 1,
      exampleExcerpt: fixMojibake((row.context_excerpt ?? "").toString()),
    });
  }

  // Edges from co_occurring_term_* on this row.
  for (const slot of COOC_SLOTS) {
    const rawPartner = row[`co_occurring_term_${slot}`];
    if (isMissing(rawPartner)) {
      if (typeof rawPartner === "string" && rawPartner.trim().toLowerCase() === "nan")
        nanCoocCount++;
      continue;
    }
    if (typeof rawPartner !== "string") continue;
    const partner = fixMojibake(rawPartner);
    if (partner !== rawPartner) mojibakeFixCount++;
    if (partner === term) continue;

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
// Write rich output (Phase 3 View B network)
// ─────────────────────────────────────────────────────────────────────

const richOutDir = dirname(OUT_RICH);
if (!existsSync(richOutDir)) mkdirSync(richOutDir, { recursive: true });
writeFileSync(OUT_RICH, JSON.stringify(result, null, 2));

// ─────────────────────────────────────────────────────────────────────
// Write Act I park summary + Act II word-network blocks + cross-park
// excerpts pool.
// ─────────────────────────────────────────────────────────────────────

type Act1TopTerm = { term: string; category: Category; frequency: number };
type Act2WordNetworkNode = {
  id: string;
  term: string;
  category: Category;
  frequency: number;
  exampleExcerpt: string;
};
type Act2WordNetwork = {
  nodes: Act2WordNetworkNode[];
  edges: Edge[];
};
type Act1Park = {
  id: string;
  name: string;
  totalWords: number;
  distinctWords: number;
  categoryWeights: Record<Category, number>;
  topTerms: Act1TopTerm[];
  exampleExcerpts: string[];
  wordNetwork: Act2WordNetwork;
};

const act1: { parks: Act1Park[] } = { parks: [] };
let unmappedParkIds = 0;
let droppedLowFrequencyNetworkEdges = 0;

function buildWordNetwork(
  nodes: Node[],
  edges: Edge[],
): { wordNetwork: Act2WordNetwork; droppedEdges: number } {
  const networkNodes: Act2WordNetworkNode[] = nodes
    .filter((node) => node.frequency >= WORD_NETWORK_MIN_FREQUENCY)
    .map((node) => ({
      id: node.term,
      term: node.term,
      category: node.category,
      frequency: node.frequency,
      exampleExcerpt: node.exampleExcerpt,
    }));

  const networkTermSet = new Set(networkNodes.map((node) => node.id));
  let droppedEdges = 0;
  const networkEdges = edges
    .filter((edge) => {
      const keep =
        networkTermSet.has(edge.source) && networkTermSet.has(edge.target);
      if (!keep) droppedEdges++;
      return keep;
    })
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
    }))
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        a.source.localeCompare(b.source) ||
        a.target.localeCompare(b.target),
    );

  return {
    wordNetwork: {
      nodes: networkNodes,
      edges: networkEdges,
    },
    droppedEdges,
  };
}

for (const p of result.parks) {
  const acc = parks.get(p.name);
  const excerpts = acc?.excerpts ?? [];
  const id = ACT1_IDS[p.name];
  if (!id) {
    unmappedParkIds++;
    console.warn(
      `  WARNING: park "${p.name}" not in ACT1_IDS map — using slug fallback`,
    );
  }

  const total = p.totalMentions || 1;
  const categoryWeights = CATEGORIES.reduce(
    (acc2, c) => {
      acc2[c] = +(p.categoryCounts[c] / total).toFixed(4);
      return acc2;
    },
    {} as Record<Category, number>,
  );

  const topTerms: Act1TopTerm[] = p.nodes
    .slice(0, TOP_TERMS_PER_PARK)
    .map((n) => ({
      term: n.term,
      category: n.category,
      frequency: n.frequency,
    }));
  const { wordNetwork, droppedEdges } = buildWordNetwork(p.nodes, p.edges);
  droppedLowFrequencyNetworkEdges += droppedEdges;

  act1.parks.push({
    id: id ?? p.id,
    name: p.name,
    totalWords: p.totalMentions,
    distinctWords: p.distinctTermsCount,
    categoryWeights,
    topTerms,
    exampleExcerpts: excerpts.slice(0, EXAMPLE_EXCERPTS_PER_PARK),
    wordNetwork,
  });
}

const act1OutDir = dirname(OUT_ACT1);
if (!existsSync(act1OutDir)) mkdirSync(act1OutDir, { recursive: true });
writeFileSync(OUT_ACT1, JSON.stringify(act1, null, 2));

// Cross-park pool: round-robin from each park's deduped excerpts so the
// pool isn't dominated by Ciani. Then take the first POOL_TARGET_SIZE.
const poolKeys = new Set<string>();
const pool: string[] = [];
const queues = act1.parks.map((p) => {
  const acc = parks.get(p.name);
  return acc ? [...acc.excerpts] : [];
});
let exhausted = false;
while (!exhausted && pool.length < POOL_TARGET_SIZE * 3) {
  exhausted = true;
  for (const q of queues) {
    const next = q.shift();
    if (!next) continue;
    exhausted = false;
    const key = excerptKey(next);
    if (poolKeys.has(key)) continue;
    poolKeys.add(key);
    pool.push(next);
    if (pool.length >= POOL_TARGET_SIZE * 2) break;
  }
}
writeFileSync(OUT_POOL, JSON.stringify(pool, null, 2));

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
console.log(
  `  Act II word-network edges dropped by frequency >= ${WORD_NETWORK_MIN_FREQUENCY} endpoint filter: ${droppedLowFrequencyNetworkEdges}`,
);
console.log(
  `  UTF-8 mojibake substrings replaced (e.g. "√©" → "é"): ${mojibakeFixCount}`,
);
console.log(
  `  parks not mapped to an Act I id (slug fallback used): ${unmappedParkIds}`,
);

console.log("");
console.log(`Wrote ${OUT_RICH}    (rich shape, Phase 3 View B)`);
console.log(`Wrote ${OUT_ACT1}        (Act I summary)`);
console.log(`Wrote ${OUT_POOL}  (${pool.length} excerpts)`);

for (const p of act1.parks) {
  console.log(
    `  ${p.name.padEnd(28)} id=${p.id.padEnd(14)} ` +
      `top=${p.topTerms.length} ` +
      `excerpts=${p.exampleExcerpts.length} ` +
      `wordNetwork=${p.wordNetwork.nodes.length} nodes/${p.wordNetwork.edges.length} edges`,
  );
}
