export const CATEGORIES = [
  "experiential_emotional",
  "sensory_environmental",
  "action",
  "relational_context",
  "infrastructure_amenities",
  "tension_complaint",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type CategoryCounts = Record<Category, number>;

export type Node = {
  term: string;
  category: Category;
  frequency: number;
  exampleExcerpt: string;
};

export type Edge = {
  source: string;
  target: string;
  weight: number;
};

export type Park = {
  id: string;
  name: string;
  totalMentions: number;
  distinctTermsCount: number;
  categoryCounts: CategoryCounts;
  nodes: Node[];
  edges: Edge[];
};

export type ParksData = {
  parks: Park[];
};

/**
 * Maps Category → CSS variable token from tokens.css. Read at runtime via
 * getComputedStyle so colours stay in sync with the design system.
 */
export const CATEGORY_TOKENS: Record<Category, string> = {
  experiential_emotional: "--color-emotional",
  sensory_environmental: "--color-sensory",
  action: "--color-action",
  relational_context: "--color-relational",
  infrastructure_amenities: "--color-infrastructure",
  tension_complaint: "--color-tension",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  experiential_emotional: "experiential",
  sensory_environmental: "sensory",
  action: "action",
  relational_context: "relational",
  infrastructure_amenities: "infrastructure",
  tension_complaint: "tension",
};
