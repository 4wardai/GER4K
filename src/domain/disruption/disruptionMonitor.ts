/**
 * Disruption_Monitor — pure, framework-free disruption impact detection.
 *
 * Given a planned {@link Journey} and the active {@link Disruption}s, the
 * Disruption_Monitor computes a {@link JourneyImpact}: whether the journey is
 * affected and, if so, the 0-based indexes of the affected legs (Requirements
 * 3.1, 3.2, 3.3). Disruption data is obtained through the {@link DataProvider}
 * boundary (Requirements 3.4, 4.6) via the convenience wrapper below. It imports
 * NOTHING from React or Next and performs no I/O in its core: given the same
 * journey + disruptions + network it always returns the same result
 * (deterministic), so it is trivially unit- and property-testable with Vitest.
 *
 * ── The leg-vs-segment granularity challenge (why this is non-trivial) ──────
 * The Journey_Planner aggregates consecutive same-line segments into ONE leg.
 * So the baseline journey's leg 0 is a single "Putrajaya Line: Putrajaya Sentral
 * → Ampang Park" leg that INTERNALLY spans
 *   Putrajaya Sentral → Chan Sow Lin → TRX → Conlay → Ampang Park.
 * The demo disruption's `affectedSegment` is TRX → Conlay — an INTERIOR hop of
 * that aggregated leg, NOT the leg's own `from`/`to`. Therefore we CANNOT simply
 * compare `leg.from`/`leg.to` against the disruption segment. Instead we must
 * determine whether a leg's ride along its line TRAVERSES the disrupted segment.
 *
 * ── How a leg is matched against a disrupted segment ────────────────────────
 * For each leg and each disruption:
 *   1. LINE MATCH. The leg carries `line` as the display NAME (e.g. "Putrajaya
 *      Line") while the disruption's `affectedSegment.line` is the line ID (e.g.
 *      "putrajaya-line"). We resolve the leg to a {@link NetworkLine} by matching
 *      the leg's `line` against either the network line's `name` OR its `id`
 *      (and likewise resolve the disruption's `affectedSegment.line` against id
 *      or name). The leg traverses the disruption only on the SAME resolved line.
 *      When the disruption's segment carries no `line`, we fall back to matching
 *      on any line the leg could ride that contains the adjacent pair.
 *   2. EXPAND THE LEG TO ITS COVERED STATION RANGE. Using the matched line's
 *      ordered `stationIds`, we take the ordered sublist the leg covers between
 *      `leg.from` and `leg.to` (respecting the direction the planner built — the
 *      planner only rides a line in its listed order, so `from` precedes `to`).
 *   3. ADJACENCY CHECK. The leg traverses the disrupted segment when the
 *      disruption's `from` → `to` appears as an ADJACENT pair within that covered
 *      sublist (in the leg's travel direction).
 *
 * ── Result (Requirements 3.1 / 3.2 / 3.3) ──────────────────────────────────
 *   affected           = true iff any leg traverses any disrupted segment.
 *   affectedLegIndexes = ascending, de-duplicated 0-based indexes of such legs.
 * A disruption present but affecting no leg yields `{ affected: false,
 * affectedLegIndexes: [] }`. Multiple disruptions and multiple legs are handled
 * generally — nothing is hardcoded to the demo.
 *
 * ── Demo expectation (Requirement 4.6) ─────────────────────────────────────
 * For the baseline Putrajaya Sentral → KLCC journey with the demo TRX → Conlay
 * Putrajaya Line disruption:
 *   - leg 0 = Putrajaya Line, covers [putrajaya-sentral, chan-sow-lin, trx,
 *     conlay, ampang-park]; the disrupted pair trx → conlay is adjacent within
 *     that sublist → leg 0 IS affected.
 *   - leg 1 = Kelana Jaya Line, Ampang Park → KLCC → NOT affected.
 * Expected JourneyImpact: `{ affected: true, affectedLegIndexes: [0] }`.
 */

import type { DataProvider } from "@/data";
import type {
  Disruption,
  Journey,
  JourneyImpact,
  JourneyLeg,
  NetworkLine,
  TransportNetwork,
} from "@/types";

/**
 * Resolve a leg's/disruption's line reference (which may be a display NAME or a
 * line ID) to the network line it refers to. Matches on `id` first, then `name`.
 * Returns `undefined` when the reference is absent or does not resolve.
 */
function resolveLine(
  ref: string | undefined,
  network: TransportNetwork,
): NetworkLine | undefined {
  if (!ref) return undefined;
  return (
    network.lines.find((l) => l.id === ref) ??
    network.lines.find((l) => l.name === ref)
  );
}

/**
 * Expand a leg into the ordered station sublist it covers on `line`, between
 * `leg.from` and `leg.to`, in the leg's travel direction.
 *
 * The planner only rides a line in its listed `stationIds` order, so `from`
 * precedes `to`. Returns `null` when either endpoint is not on the line or the
 * order is inverted (which would indicate the leg does not ride this line as
 * modelled, so it cannot traverse a segment on it).
 */
function coveredStationRange(
  leg: JourneyLeg,
  line: NetworkLine,
): string[] | null {
  const fromIdx = line.stationIds.indexOf(leg.from);
  const toIdx = line.stationIds.indexOf(leg.to);
  if (fromIdx === -1 || toIdx === -1) return null;
  if (fromIdx > toIdx) return null; // leg does not ride this line in-order
  return line.stationIds.slice(fromIdx, toIdx + 1);
}

/**
 * True when `from` → `to` appears as an ADJACENT, forward-ordered pair within
 * the covered station sublist.
 */
function rangeContainsAdjacentPair(
  covered: string[],
  from: string,
  to: string,
): boolean {
  for (let i = 0; i < covered.length - 1; i++) {
    if (covered[i] === from && covered[i + 1] === to) return true;
  }
  return false;
}

/**
 * Determine whether a single leg traverses a single disruption's affected
 * segment, per the line-match + expand + adjacency rule documented above.
 */
function legTraversesDisruption(
  leg: JourneyLeg,
  disruption: Disruption,
  network: TransportNetwork,
): boolean {
  const { from, to, line: disruptionLineRef } = disruption.affectedSegment;
  const legLine = resolveLine(leg.line, network);

  // Candidate lines this leg could be riding. Normally exactly the leg's own
  // resolved line; this stays robust if a leg's `line` is missing/unresolved.
  const candidateLines: NetworkLine[] = legLine
    ? [legLine]
    : network.lines.filter(
        (l) =>
          l.stationIds.includes(leg.from) && l.stationIds.includes(leg.to),
      );

  const disruptionLine = resolveLine(disruptionLineRef, network);

  for (const line of candidateLines) {
    // If the disruption names a line, the leg must be riding that same line.
    if (disruptionLine && line.id !== disruptionLine.id) continue;

    const covered = coveredStationRange(leg, line);
    if (!covered) continue;

    if (rangeContainsAdjacentPair(covered, from, to)) return true;
  }

  return false;
}

/**
 * Evaluate whether any of the given `disruptions` affect `journey`, using the
 * `network` to expand aggregated legs into the station ranges they cover.
 *
 * This is the PURE CORE: explicit inputs, deterministic output, no I/O, no
 * framework imports. Prefer this in tests and wherever the network and
 * disruptions are already in hand.
 *
 * @returns A {@link JourneyImpact} with `affected` and ascending, de-duplicated
 *   `affectedLegIndexes`.
 */
export function evaluateImpact(
  journey: Journey,
  disruptions: Disruption[],
  network: TransportNetwork,
): JourneyImpact {
  const affectedLegIndexes: number[] = [];

  journey.legs.forEach((leg, index) => {
    const traversed = disruptions.some((d) =>
      legTraversesDisruption(leg, d, network),
    );
    if (traversed) affectedLegIndexes.push(index);
  });

  return {
    affected: affectedLegIndexes.length > 0,
    affectedLegIndexes,
  };
}

/**
 * DataProvider-backed convenience wrapper (Requirements 3.4, 4.6).
 *
 * Reads the active disruptions via `provider.getDisruptions()` and the network
 * via `provider.getNetwork()`, then delegates to the pure {@link evaluateImpact}.
 * Keeping the core pure means this wrapper is the only part that touches the
 * data boundary, satisfying "obtain disruption data through the Data_Provider
 * interface" without coupling the detection logic to the provider.
 */
export function evaluateImpactViaProvider(
  journey: Journey,
  provider: DataProvider,
): JourneyImpact {
  return evaluateImpact(
    journey,
    provider.getDisruptions(),
    provider.getNetwork(),
  );
}
