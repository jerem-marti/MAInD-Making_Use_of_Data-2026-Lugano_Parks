// Phase 4-reusable data loader.
// Reads precomputed park weights from data/parks.json (produced by prep_data.py).
// Keeps the loader's surface narrow on purpose: one function, returns a
// well-typed payload, no side effects, no DOM.

/**
 * @typedef {Object} ParkRecord
 * @property {string} name           full park name e.g. "Parco Ciani"
 * @property {string} short_name     display label e.g. "Ciani"
 * @property {Object<string,number>} weights  category id -> 0..1, sums to ~1
 * @property {number} review_count_proxy
 * @property {number} unique_terms
 *
 * @typedef {Object} ParksPayload
 * @property {string[]} categories                ordered category ids
 * @property {Object<string,string>} labels       category id -> human label
 * @property {ParkRecord[]} parks
 */

/** @returns {Promise<ParksPayload>} */
export async function loadParks(url = "./data/parks.json") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

/** Convert a weights object into an array aligned with `categories`. */
export function weightsArray(weights, categories) {
  return categories.map((c) => weights[c] ?? 0);
}
