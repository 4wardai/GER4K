/**
 * Journey_Planner — pure, framework-free multimodal journey planning.
 *
 * Builds an ordered {@link Journey} from an origin station to a destination
 * station using the fixture {@link TransportNetwork} reached through the
 * {@link DataProvider} boundary (Requirement 1.4). It imports NOTHING from React
 * or Next and performs no I/O — given the same network + origin/destination it
 * always returns the same result (deterministic), so it is trivially unit- and
 * property-testable with Vitest.
 *
 * ── What it computes (Requirements 1.1, 1.2) ───────────────────────────────
 * The planner performs a deterministic shortest-path search over the network's
 * directed segments and inter-line interchanges, then collapses that raw
 * station-by-station path into a compact list of {@link JourneyLeg}s — one leg
 * per continuous ride on a single line — and computes the journey totals.
 *
 * ── Leg model (documented) ─────────────────────────────────────────────────
 * A **leg is one continuous ride on a single line** between the station where
 * you board that line and the station where you leave it. Consecutive segments
 * on the SAME line are aggregated into a single leg:
 *
 *   - `from` / `to`   — boarding and alighting station ids for that line-ride.
 *   - `mode`          — the line's transport mode (MRT / LRT / …).
 *   - `line`          — the line's display name (e.g. "Putrajaya Line").
 *   - `travelTimeMin` — SUM of the in-vehicle segment travel times for the ride.
 *   - `walkMeters`    — SUM of any per-segment walk metres on the ride (normally
 *                       0 for in-vehicle hops in the fixture).
 *
 * An **interchange between two lines is NOT its own leg.** It is the transfer
 * *between* two legs: its `transferTimeMin` and `walkMeters` are folded into the
 * journey totals (not into either adjacent leg), and each interchange used
 * increments `transfers`.
 *
 * For the baseline Putrajaya Sentral → KLCC this yields exactly two legs:
 *   leg 1 = Putrajaya Line, Putrajaya Sentral → Ampang Park (segments PS→Chan
 *           Sow Lin→TRX→Conlay→Ampang Park aggregated),
 *   leg 2 = Kelana Jaya Line, Ampang Park → KLCC,
 * with one interchange at Ampang Park between them.
 *
 * ── Totals (Requirement 1.2) ───────────────────────────────────────────────
 *   totalTimeMin    = Σ(segment travelTimeMin) + Σ(interchange transferTimeMin)
 *   transfers       = number of interchanges used
 *   totalWalkMeters = Σ(interchange walkMeters) + Σ(segment walkMeters)
 *
 * For the baseline this is 28 min, 1 transfer, 180 m (see fixture notes).
 *
 * ── Labelling (Requirement 2, data-source boundary table) ──────────────────
 * Legs and the journey are built from network/schedule-derived data, so every
 * leg and the journey carry `sourceStatus = "SCHEDULED"`, `isSimulated = false`.
 *
 * ── NoRouteFound (Requirement 1.3) ─────────────────────────────────────────
 * The planner returns a discriminated {@link PlanResult} union — either
 * `{ ok: true, journey }` or `{ ok: false, reason: "NoRouteFound" }`. This is
 * type-safe, forces callers (UI task 3.3/3.4) to handle the no-route case, and
 * is intentionally shaped like the `NoAlternativeFound` result the
 * Recovery_Engine will later return, so the two read consistently.
 *
 * ── Path selection rule (Requirements 1.1, deterministic) ──────────────────
 * The search minimises total journey time (segment travel + interchange
 * transfer time). Ties are broken deterministically, in order:
 *   1. lowest total time,
 *   2. then fewest transfers (interchanges used),
 *   3. then least total walking,
 *   4. then a stable lexicographic comparison of the path's station/line
 *      sequence,
 * so the same network + O/D always yields the identical journey. For the
 * baseline O/D this selects the Putrajaya Line → (Ampang Park) → Kelana Jaya
 * Line path, which naturally travels through the TRX→Conlay segment — exactly
 * the path the later disruption must mark affected.
 */

import type {
  DataProvider,
} from "@/data";
import type {
  Journey,
  JourneyLeg,
  NetworkInterchange,
  NetworkLine,
  NetworkSegment,
  SourceStatus,
  TransportNetwork,
} from "@/types";

/** Label applied to every network/schedule-derived leg and journey. */
const SCHEDULED: SourceStatus = "SCHEDULED";

/** Options for {@link planJourney}. All optional and framework-free. */
export interface PlanJourneyOptions {
  /**
   * Optional departure time. Not used to recompute schedule-relative times in
   * the MVP (the fixture carries static estimates), but accepted so callers and
   * later real providers can pass it through without a signature change. Kept so
   * the planner API matches Requirement 1.1 (origin, destination, departure).
   */
  departureTime?: Date | string;
  /**
   * Segments to treat as blocked, identified by `from|to|lineId`. The baseline
   * planner leaves this empty; the Recovery_Engine (conceptually reusing this
   * search) passes the disrupted segment(s) so no returned leg traverses them.
   */
  blockedSegments?: ReadonlyArray<{ from: string; to: string; lineId: string }>;
}

/** Discriminated result of a planning attempt. */
export type PlanResult =
  | { ok: true; journey: Journey }
  | { ok: false; reason: "NoRouteFound" };

/** Convenience type guard for consumers. */
export function isNoRouteFound(
  result: PlanResult,
): result is { ok: false; reason: "NoRouteFound" } {
  return result.ok === false;
}

// ── Internal search model ─────────────────────────────────────────────────
//
// A search *node* is the pair (stationId, lineId): "I am at this station, riding
// this line." Edges are:
//   - a segment: ride one hop along the SAME line (stay on lineId),
//   - an interchange: switch lines at the current station (change lineId),
//     paying transferTimeMin + walkMeters.
// Modelling the line in the node lets us (a) aggregate consecutive same-line
// segments into one leg and (b) count a transfer exactly when lineId changes.

interface SearchState {
  stationId: string;
  lineId: string;
}

interface PathStep {
  /** The segment ridden to reach this state, if the edge was a segment. */
  segment?: NetworkSegment;
  /** The interchange used to reach this state, if the edge was a transfer. */
  interchange?: NetworkInterchange;
  state: SearchState;
}

interface Frontier {
  state: SearchState;
  /** Cost so far = Σ travel + Σ transfer time. Primary sort key. */
  time: number;
  /** Transfers so far. Secondary tie-break. */
  transfers: number;
  /** Walk metres so far. Tertiary tie-break. */
  walk: number;
  /** Ordered steps taken from the (virtual) origin to this state. */
  steps: PathStep[];
}

function stateKey(s: SearchState): string {
  return `${s.stationId}\u0000${s.lineId}`;
}

/** Stable lexicographic key for a path, used as the final tie-break. */
function pathSignature(steps: PathStep[]): string {
  return steps.map((step) => stateKey(step.state)).join("\u0001");
}

/**
 * Compare two frontier candidates with the documented deterministic ordering:
 * time, then transfers, then walk, then a stable path signature. Returns < 0
 * when `a` should be preferred.
 */
function compareFrontier(a: Frontier, b: Frontier): number {
  if (a.time !== b.time) return a.time - b.time;
  if (a.transfers !== b.transfers) return a.transfers - b.transfers;
  if (a.walk !== b.walk) return a.walk - b.walk;
  const sa = pathSignature(a.steps);
  const sb = pathSignature(b.steps);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function isBlocked(
  segment: NetworkSegment,
  blocked: PlanJourneyOptions["blockedSegments"],
): boolean {
  if (!blocked || blocked.length === 0) return false;
  return blocked.some(
    (b) =>
      b.from === segment.from &&
      b.to === segment.to &&
      b.lineId === segment.lineId,
  );
}

/**
 * Deterministic shortest-path search over the network, returning the ordered
 * steps of the best path from `originId` to `destinationId`, or `null` when no
 * path exists.
 *
 * Implemented as a uniform-cost (Dijkstra-style) search with the documented
 * tie-break applied via a stable insertion sort of the frontier. The network is
 * tiny (the demo fixture), so clarity and determinism are prioritised over raw
 * throughput; complexity is comfortably fine for fixture-sized graphs.
 */
function search(
  network: TransportNetwork,
  originId: string,
  destinationId: string,
  options: PlanJourneyOptions,
): PathStep[] | null {
  if (originId === destinationId) return [];

  // Index segments and interchanges by their source station for fast expansion.
  const segmentsFrom = new Map<string, NetworkSegment[]>();
  for (const seg of network.segments) {
    const list = segmentsFrom.get(seg.from) ?? [];
    list.push(seg);
    segmentsFrom.set(seg.from, list);
  }
  const interchangesAt = new Map<string, NetworkInterchange[]>();
  for (const ic of network.interchanges) {
    const list = interchangesAt.get(ic.stationId) ?? [];
    list.push(ic);
    interchangesAt.set(ic.stationId, list);
  }

  // Seed the frontier with one virtual start state per line that serves the
  // origin station. Boarding the origin's line costs nothing and is not a
  // transfer, so the first leg starts cleanly on whichever line is optimal.
  const originLines = network.lines.filter((l) =>
    l.stationIds.includes(originId),
  );

  const frontier: Frontier[] = originLines.map((line) => ({
    state: { stationId: originId, lineId: line.id },
    time: 0,
    transfers: 0,
    walk: 0,
    steps: [],
  }));

  const best = new Map<string, number>();
  let found: Frontier | null = null;

  while (frontier.length > 0) {
    // Pop the best candidate per the deterministic ordering.
    frontier.sort(compareFrontier);
    const current = frontier.shift() as Frontier;
    const key = stateKey(current.state);

    const prevBest = best.get(key);
    if (prevBest !== undefined && prevBest <= current.time) {
      // Already settled this state with an equal-or-better cost. Because the
      // frontier is ordered, the first time we settle a state it is optimal;
      // skip stale duplicates.
      continue;
    }
    best.set(key, current.time);

    if (current.state.stationId === destinationId) {
      found = current;
      break;
    }

    // Expand: ride a same-line segment out of this station.
    const segs = segmentsFrom.get(current.state.stationId) ?? [];
    for (const seg of segs) {
      if (seg.lineId !== current.state.lineId) continue; // only ride current line
      if (isBlocked(seg, options.blockedSegments)) continue;
      const next: Frontier = {
        state: { stationId: seg.to, lineId: seg.lineId },
        time: current.time + seg.travelTimeMin,
        transfers: current.transfers,
        walk: current.walk + seg.walkMeters,
        steps: [...current.steps, { segment: seg, state: { stationId: seg.to, lineId: seg.lineId } }],
      };
      frontier.push(next);
    }

    // Expand: transfer to another line at this station.
    const ics = interchangesAt.get(current.state.stationId) ?? [];
    for (const ic of ics) {
      if (ic.fromLineId !== current.state.lineId) continue;
      const next: Frontier = {
        state: { stationId: current.state.stationId, lineId: ic.toLineId },
        time: current.time + ic.transferTimeMin,
        transfers: current.transfers + 1,
        walk: current.walk + ic.walkMeters,
        steps: [
          ...current.steps,
          {
            interchange: ic,
            state: { stationId: current.state.stationId, lineId: ic.toLineId },
          },
        ],
      };
      frontier.push(next);
    }
  }

  return found ? found.steps : null;
}

/**
 * Collapse the raw search steps into the compact leg list + totals described in
 * the leg model above. Consecutive same-line segment steps become one leg;
 * interchange steps separate legs and fold into the totals.
 */
function buildJourney(
  originId: string,
  destinationId: string,
  steps: PathStep[],
  lineById: Map<string, NetworkLine>,
): Journey {
  const legs: JourneyLeg[] = [];
  let totalTimeMin = 0;
  let totalWalkMeters = 0;
  let transfers = 0;

  // Accumulator for the leg currently being built.
  let legFrom = originId;
  let legLineId: string | null = null;
  let legTravel = 0;
  let legWalk = 0;
  let legTo = originId;

  const flushLeg = () => {
    if (legLineId === null) return;
    const line = lineById.get(legLineId);
    legs.push({
      from: legFrom,
      to: legTo,
      mode: line?.mode ?? "",
      line: line?.name,
      travelTimeMin: legTravel,
      walkMeters: legWalk,
      sourceStatus: SCHEDULED,
      isSimulated: false,
    });
  };

  for (const step of steps) {
    if (step.segment) {
      const seg = step.segment;
      if (legLineId === null) {
        // Start the first leg on this segment's line.
        legLineId = seg.lineId;
        legFrom = seg.from;
        legTravel = 0;
        legWalk = 0;
      }
      legTravel += seg.travelTimeMin;
      legWalk += seg.walkMeters;
      legTo = seg.to;

      totalTimeMin += seg.travelTimeMin;
      totalWalkMeters += seg.walkMeters;
    } else if (step.interchange) {
      const ic = step.interchange;
      // Close the leg ridden up to this interchange station, then start the
      // next leg on the line we transfer to, boarding at the same station.
      flushLeg();
      transfers += 1;
      totalTimeMin += ic.transferTimeMin;
      totalWalkMeters += ic.walkMeters;

      legLineId = ic.toLineId;
      legFrom = ic.stationId;
      legTo = ic.stationId;
      legTravel = 0;
      legWalk = 0;
    }
  }
  // Flush the final leg.
  flushLeg();

  return {
    id: `journey-${originId}-to-${destinationId}`,
    legs,
    totalTimeMin,
    transfers,
    totalWalkMeters,
    sourceStatus: SCHEDULED,
    isSimulated: false,
  };
}

/**
 * Plan a multimodal journey from `originId` to `destinationId` using transport
 * data obtained through the {@link DataProvider} (Requirement 1.4).
 *
 * This is the primary entry point. It is pure and deterministic: identical
 * inputs always yield an identical {@link PlanResult}. See the module docstring
 * for the leg model, totals, labelling, path-selection rule, and the
 * {@link PlanResult} / NoRouteFound shape.
 *
 * @param provider      The data boundary. The network is read via `getNetwork()`.
 * @param originId      Origin station id.
 * @param destinationId Destination station id.
 * @param options       Optional departure time / blocked segments.
 */
export function planJourney(
  provider: DataProvider,
  originId: string,
  destinationId: string,
  options: PlanJourneyOptions = {},
): PlanResult {
  return planJourneyOnNetwork(
    provider.getNetwork(),
    originId,
    destinationId,
    options,
  );
}

/**
 * Lower-level variant that plans against an explicit {@link TransportNetwork}.
 *
 * Useful for the Recovery_Engine and for tests that want to supply a network
 * directly. `planJourney` is a thin wrapper that reads the network from the
 * provider and delegates here, so both share identical logic.
 */
export function planJourneyOnNetwork(
  network: TransportNetwork,
  originId: string,
  destinationId: string,
  options: PlanJourneyOptions = {},
): PlanResult {
  const lineById = new Map<string, NetworkLine>(
    network.lines.map((l) => [l.id, l]),
  );

  const steps = search(network, originId, destinationId, options);
  if (steps === null) {
    return { ok: false, reason: "NoRouteFound" };
  }
  if (steps.length === 0) {
    // Origin === destination: a trivial, empty journey. Still a valid plan.
    return {
      ok: true,
      journey: {
        id: `journey-${originId}-to-${destinationId}`,
        legs: [],
        totalTimeMin: 0,
        transfers: 0,
        totalWalkMeters: 0,
        sourceStatus: SCHEDULED,
        isSimulated: false,
      },
    };
  }

  return {
    ok: true,
    journey: buildJourney(originId, destinationId, steps, lineById),
  };
}
