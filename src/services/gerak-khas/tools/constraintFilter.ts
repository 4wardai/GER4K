/**
 * Deterministic constraint filtering (Requirement 11, 15).
 *
 * The orchestrator FILTERS the candidate set with explicit passenger
 * constraints BEFORE the Ranking_Engine orders it. This is pure and bounded:
 * a single filter pass, no sorting (ranking stays with `rankAlternatives`), no
 * LLM. The LLM never filters and never ranks.
 */
import type { JourneyOption } from "@/types";
import type { ConstraintSet } from "../types";
import { optionHasBus, optionTouches } from "./helpers";

export interface ConstraintFilterResult {
  subset: JourneyOption[];
  /** True when a constraint removed at least one candidate. */
  applied: boolean;
  /** True when the constraints left nothing. */
  empty: boolean;
}

export function applyConstraints(
  candidates: JourneyOption[],
  constraints: ConstraintSet,
): ConstraintFilterResult {
  let subset = candidates;
  let applied = false;

  if (constraints.excludeStationIds.length > 0) {
    const before = subset.length;
    subset = subset.filter(
      (o) => !constraints.excludeStationIds.some((id) => optionTouches(o, id)),
    );
    if (subset.length !== before) applied = true;
  }

  if (constraints.requireBus) {
    const before = subset.length;
    subset = subset.filter((o) => optionHasBus(o));
    if (subset.length !== before) applied = true;
  }

  return { subset, applied, empty: subset.length === 0 };
}
