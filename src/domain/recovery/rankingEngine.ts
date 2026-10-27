/**
 * Ranking_Engine — pure, framework-free deterministic ranking of recovery
 * alternatives by a selected {@link PreferenceProfile}.
 *
 * Given a set of candidate {@link Journey}s and a profile, the Ranking_Engine
 * orders them best-first using a weighted sum of MIN–MAX NORMALIZED attributes
 * `{ travelTimeMin, transfers, totalWalkMeters }` — LOWER cost ranks higher
 * (Requirements 6.1, 6.2). Re-ranking the SAME set with a different profile just
 * re-runs this function (Requirement 6.3), and the computation is fully
 * deterministic and imports NOTHING from React/Next and NOTHING from the AI
 * layer (Requirement 6.6). It is trivially Vitest-testable.
 *
 * ── Return-shape choice (documented) ────────────────────────────────────────
 * The spec's {@link RankedJourney} bundles `{ journey, rank, confidence }`, but
 * `confidence` is the Confidence_Indicator's concern (task 8.3), NOT ranking's.
 * So this module does NOT compute confidence and does NOT build `RankedJourney`.
 * Instead it exposes two pure ordering functions:
 *
 *   - {@link rankAlternatives} → a NEW `Journey[]` sorted best-first.
 *   - {@link rankWithPositions} → a NEW `RankedPosition[]` of `{ journey, rank }`
 *     with 1-based ranks, for callers that want positions without confidence.
 *
 * Task 10.x assembles the full {@link RankedJourney[]} by combining this
 * ordering with the Confidence_Indicator. Neither function MUTATES its input —
 * both return fresh arrays and never reorder the caller's array in place.
 *
 * ── Algorithm (implemented exactly as the design specifies) ─────────────────
 * Attributes per journey: `{ travelTimeMin, transfers, totalWalkMeters }`,
 * read as `totalTimeMin`, `transfers`, `totalWalkMeters` off the {@link Journey}.
 *
 * Per-profile weights `(wTime / wTransfers / wWalk)`:
 *
 *   | Profile          | wTime | wTransfers | wWalk |
 *   | ---------------- | ----- | ---------- | ----- |
 *   | Balanced         |  1.0  |    1.0     |  1.0  |
 *   | Fastest          |  3.0  |    0.5     |  0.5  |
 *   | Least Walking    |  0.5  |    0.5     |  3.0  |
 *   | Fewest Transfers |  0.5  |    3.0     |  0.5  |
 *
 * For each attribute, MIN–MAX normalize across the candidate set into `[0,1]`
 * (`nTime`, `nTransfers`, `nWalk`). If an attribute is CONSTANT across the
 * candidates (`max === min`), its normalized value is `0` for every candidate
 * (this avoids a divide-by-zero and means a shared attribute contributes nothing
 * to the ordering). Then:
 *
 *   cost = wTime * nTime + wTransfers * nTransfers + wWalk * nWalk
 *
 * Sort ASCENDING by cost (lower is better). Tie-break: shortest `travelTimeMin`,
 * then stable journey `id` (lexicographic). The tie-break on raw
 * `travelTimeMin` (not the normalized value) keeps "faster wins ties" intuitive,
 * and the id tie-break makes the order total and reproducible.
 */

import type { Journey, PreferenceProfile } from "@/types";

/**
 * The normalized attributes a profile weights.
 *
 * Full Vision extension (Requirement 16): `wFare`, `wCrowd` and `wAccess` weigh
 * the optional `fareSen`, `crowdLevel` and `accessIssues` journey attributes. A
 * journey that lacks one of these reads it as 0; when every candidate lacks it
 * the attribute is constant, normalizes to 0 and contributes nothing — so the
 * MVP inputs rank exactly as before.
 */
interface ProfileWeights {
  /** Weight on normalized total travel time. */
  wTime: number;
  /** Weight on normalized transfer count. */
  wTransfers: number;
  /** Weight on normalized total walking distance. */
  wWalk: number;
  /** Weight on normalized estimated fare. */
  wFare: number;
  /** Weight on normalized crowding level (Pulse at touch stations). */
  wCrowd: number;
  /** Weight on normalized accessibility-issue count. */
  wAccess: number;
}

/**
 * Per-profile ranking weights, exactly as the design's weights table specifies.
 * Exported (read-only) so tests and callers can reference the single source of
 * truth rather than re-declaring them.
 *
 * Balanced's time weight is 1.5 (Full Vision): a disrupted commuter's first
 * concern is arrival time. On the MVP pair this changes nothing — Alt A already
 * won the Balanced tie-break.
 */
export const PROFILE_WEIGHTS: Readonly<Record<PreferenceProfile, ProfileWeights>> = {
  Balanced: { wTime: 1.5, wTransfers: 1.0, wWalk: 1.0, wFare: 0.5, wCrowd: 0.5, wAccess: 0 },
  Fastest: { wTime: 3.0, wTransfers: 0.5, wWalk: 0.5, wFare: 0.25, wCrowd: 0.25, wAccess: 0 },
  "Least Walking": { wTime: 0.5, wTransfers: 0.5, wWalk: 3.0, wFare: 0.25, wCrowd: 0.25, wAccess: 0 },
  "Fewest Transfers": { wTime: 0.5, wTransfers: 3.0, wWalk: 0.5, wFare: 0.25, wCrowd: 0.25, wAccess: 0 },
  Cheapest: { wTime: 0.5, wTransfers: 0.25, wWalk: 0.25, wFare: 3.0, wCrowd: 0.25, wAccess: 0 },
  "Avoid Crowding": { wTime: 0.5, wTransfers: 0.5, wWalk: 0.5, wFare: 0.25, wCrowd: 3.0, wAccess: 0 },
  Accessible: { wTime: 0.5, wTransfers: 2.0, wWalk: 2.5, wFare: 0.25, wCrowd: 1.0, wAccess: 3.0 },
};

/** A journey paired with its 1-based rank after deterministic ordering. */
export interface RankedPosition {
  journey: Journey;
  /** 1-based rank; `1` is the best (lowest-cost) alternative. */
  rank: number;
}

/**
 * Min–max normalize a single value against the candidate set's min/max.
 *
 * Returns `0` when the attribute is CONSTANT across the set (`max === min`),
 * which both avoids a divide-by-zero and makes a shared attribute contribute
 * nothing to the weighted cost.
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

/**
 * Compute the weighted min–max cost for every candidate under `profile`.
 * Lower cost is better. Pure helper shared by the public ranking functions.
 */
function computeCosts(
  journeys: ReadonlyArray<Journey>,
  profile: PreferenceProfile,
): Map<Journey, number> {
  const weights = PROFILE_WEIGHTS[profile];

  // Attribute readers. Optional Full Vision attributes default to 0.
  const readers: Array<{ weight: number; read: (j: Journey) => number }> = [
    { weight: weights.wTime, read: (j) => j.totalTimeMin },
    { weight: weights.wTransfers, read: (j) => j.transfers },
    { weight: weights.wWalk, read: (j) => j.totalWalkMeters },
    { weight: weights.wFare, read: (j) => j.fareSen ?? 0 },
    { weight: weights.wCrowd, read: (j) => j.crowdLevel ?? 0 },
    { weight: weights.wAccess, read: (j) => j.accessIssues ?? 0 },
  ];

  const ranges = readers.map(({ read }) => {
    const values = journeys.map(read);
    return { min: Math.min(...values), max: Math.max(...values) };
  });

  const costs = new Map<Journey, number>();
  for (const journey of journeys) {
    let cost = 0;
    readers.forEach(({ weight, read }, i) => {
      if (weight === 0) return;
      cost += weight * normalize(read(journey), ranges[i].min, ranges[i].max);
    });
    costs.set(journey, cost);
  }
  return costs;
}

/**
 * Deterministic comparison of two journeys by their weighted cost, with the
 * defined tie-break: ascending cost, then shortest `travelTimeMin`, then stable
 * journey `id` (lexicographic).
 */
function compareByCost(
  a: Journey,
  b: Journey,
  costs: Map<Journey, number>,
): number {
  const costA = costs.get(a) ?? 0;
  const costB = costs.get(b) ?? 0;
  if (costA !== costB) return costA - costB;

  // Tie-break 1: shortest total travel time.
  if (a.totalTimeMin !== b.totalTimeMin) return a.totalTimeMin - b.totalTimeMin;

  // Tie-break 2: stable journey id (lexicographic) for a total, reproducible order.
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Rank `journeys` for `profile`, returning a NEW array sorted best-first
 * (lowest weighted cost first). Does NOT mutate the input.
 *
 * This is the primary ranking entry point: ordering only, with no confidence
 * computed (that is the Confidence_Indicator's job, task 8.3). Re-ranking the
 * same set under a different profile is simply another call with a different
 * `profile` (Requirement 6.3).
 *
 * @param journeys The candidate alternatives to order (not mutated).
 * @param profile  The preference profile selecting the weights.
 * @returns A fresh `Journey[]` in ranked order; `[]` for an empty input.
 */
export function rankAlternatives(
  journeys: ReadonlyArray<Journey>,
  profile: PreferenceProfile,
): Journey[] {
  if (journeys.length === 0) return [];
  const costs = computeCosts(journeys, profile);
  return [...journeys].sort((a, b) => compareByCost(a, b, costs));
}

/**
 * Rank `journeys` for `profile` and return a NEW array of `{ journey, rank }`
 * with 1-based ranks assigned in best-first order. Does NOT mutate the input.
 *
 * Useful for callers that want explicit positions without confidence; task 10.x
 * can fold these positions together with the Confidence_Indicator to build the
 * spec's {@link RankedJourney}.
 */
export function rankWithPositions(
  journeys: ReadonlyArray<Journey>,
  profile: PreferenceProfile,
): RankedPosition[] {
  return rankAlternatives(journeys, profile).map((journey, index) => ({
    journey,
    rank: index + 1,
  }));
}

/**
 * Compute the weighted min–max cost of each candidate under `profile`, returned
 * as `{ journey, cost }[]` in the SAME order as the input (not sorted).
 *
 * Exposed primarily for tests and explainability (e.g. showing why an option
 * ranked where it did); ranking itself uses the internal cost map directly.
 */
export function rankingCosts(
  journeys: ReadonlyArray<Journey>,
  profile: PreferenceProfile,
): Array<{ journey: Journey; cost: number }> {
  if (journeys.length === 0) return [];
  const costs = computeCosts(journeys, profile);
  return journeys.map((journey) => ({
    journey,
    cost: costs.get(journey) ?? 0,
  }));
}
