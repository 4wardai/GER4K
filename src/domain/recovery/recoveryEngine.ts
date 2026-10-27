/**
 * Recovery_Engine — pure, framework-free recovery-route generation.
 *
 * Given an affected journey's origin/destination, the active {@link Disruption}s,
 * and the {@link TransportNetwork} (reached through the {@link DataProvider}
 * boundary, Requirement 5.5), the Recovery_Engine generates alternative
 * {@link Journey}s that AVOID the affected part of the network (Requirement 5.1).
 * It imports NOTHING from React or Next and performs no I/O in its core: given
 * the same network + O/D + disruptions it always returns the same ordered list
 * (deterministic), so it is trivially unit-testable with Vitest.
 *
 * ── Scope of THIS module (task 7.1) ────────────────────────────────────────
 * This task focuses on GENERATING the alternatives. It returns `Journey[]`.
 * Task 7.2 wraps this with explicit avoid-validation and a `NoAlternativeFound`
 * result type. Everything generated here already avoids the blocked segment(s)
 * BY CONSTRUCTION — each alternative is planned with those segments passed to the
 * planner's `blockedSegments` option, and the planner's search never traverses a
 * blocked segment. Ranking and confidence are explicitly NOT computed here (that
 * is task 8); the returned order is a stable, deterministic generation order.
 *
 * ── Reusing the planner (no re-implemented pathfinding) ─────────────────────
 * Alternatives are built with {@link planJourneyOnNetwork}, so each alternative
 * is a proper {@link Journey} with ordered, aggregated legs and correct totals,
 * and every leg is labelled `SCHEDULED` / `isSimulated = false` (the planner
 * applies those labels to network/schedule-derived legs).
 *
 * ── Computing the blocked segments from disruptions (Requirement 5.1) ───────
 * Each disruption carries an `affectedSegment { from, to, line? }` where `line`
 * may be a line ID or a display name (mirroring the Disruption_Monitor). We
 * resolve that reference to a concrete network line (id-first, then name) to
 * obtain its `lineId`, producing `{ from, to, lineId }` entries for the
 * planner's `blockedSegments`. When a disruption's segment names no line, we
 * emit one blocked entry per network segment matching the `from`/`to` pair, so
 * the hop is avoided on whichever line(s) carry it.
 *
 * ── Generating ≥2 DISTINCT alternatives (Requirement 5.2), deterministically ─
 * A single blocked-segments plan returns only ONE optimal avoiding route, so it
 * cannot by itself satisfy "at least two valid alternatives". We instead run a
 * deterministic iterative edge-removal loop (a small k-distinct-routes search):
 *
 *   1. Plan avoiding the disruption-blocked segments → the best avoiding route.
 *   2. To force the NEXT structurally distinct route, additionally block the
 *      found route's FIRST "branch" segment — the first segment it rides on a
 *      line OTHER than the line its first leg uses (i.e. the first hop after it
 *      first leaves its initial line). Blocking only this single divergence hop
 *      (never the shared corridor before it) pushes the planner onto a genuinely
 *      different branch while leaving every other route intact.
 *   3. Re-plan with the enlarged blocked set, collect the new route, and repeat
 *      until no new route is found, a small cap is reached, or the plan stops
 *      producing structurally-distinct journeys.
 *
 * Routes are de-duplicated by a structural signature (ordered line-ride legs),
 * so two plans that collapse to the same journey are never returned twice.
 *
 * For the demo (Putrajaya Sentral → KLCC, blocked Putrajaya Line TRX→Conlay):
 *   - Pass 1 yields Alt A — leave the Putrajaya Line at TRX → Kajang Line →
 *     Pasar Seni → Kelana Jaya Line → KLCC (≈ 34 min / 2 transfers / 520 m), the
 *     faster avoiding route.
 *   - Alt A first leaves its initial Putrajaya Line at TRX onto the Kajang Line,
 *     so its first branch hop is TRX → Pasar Seni (Kajang). Blocking that hop in
 *     pass 2 yields Alt B — leave the Putrajaya Line at Chan Sow Lin →
 *     Ampang/Sri Petaling Line → Masjid Jamek → Kelana Jaya Line → KLCC
 *     (≈ 41 min / 2 transfers / 260 m).
 * Neither route traverses the blocked TRX→Conlay segment, by construction.
 *
 * ── Ordering ───────────────────────────────────────────────────────────────
 * The returned list is ordered deterministically by total time ascending, then
 * by journey id for a stable tie-break. This is NOT a preference ranking (task
 * 8 does that) — it is just a reproducible order for the generated set.
 */

import type { DataProvider } from "@/data";
import type {
  Disruption,
  Journey,
  JourneyLeg,
  NetworkLine,
  TransportNetwork,
} from "@/types";
import {
  isNoRouteFound,
  planJourneyOnNetwork,
} from "@/domain/transport";

/** A segment blocked for planning, identified by `from|to|lineId`. */
export interface BlockedSegment {
  from: string;
  to: string;
  lineId: string;
}

/**
 * Safety cap on how many distinct alternatives the generation loop will return.
 * The demo needs two; the cap keeps the loop bounded on larger future networks
 * without changing behaviour for the fixture.
 */
const MAX_ALTERNATIVES = 6;

/**
 * Resolve a line reference (which may be a line ID or a display NAME) to the
 * network line it refers to. Matches on `id` first, then `name`. Mirrors the
 * Disruption_Monitor's `resolveLine` so both subsystems agree on what a
 * disruption's `affectedSegment.line` points at. Returns `undefined` when the
 * reference is absent or does not resolve.
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
 * Compute the set of blocked segments from the active disruptions'
 * `affectedSegment`s, resolving each disruption's line reference to a concrete
 * `lineId` (Requirement 5.1). De-duplicated by `from|to|lineId`.
 *
 * - When the disruption names a line that resolves, emit the single
 *   `{ from, to, lineId }` entry for that line.
 * - When the disruption names no line (or it does not resolve), emit one entry
 *   per network segment matching the `from`/`to` pair, so the hop is avoided on
 *   whichever line(s) carry it.
 */
export function computeBlockedSegments(
  disruptions: ReadonlyArray<Disruption>,
  network: TransportNetwork,
): BlockedSegment[] {
  const out = new Map<string, BlockedSegment>();
  const add = (seg: BlockedSegment) => {
    out.set(`${seg.from}\u0000${seg.to}\u0000${seg.lineId}`, seg);
  };

  for (const disruption of disruptions) {
    const { from, to, line: lineRef } = disruption.affectedSegment;
    const resolved = resolveLine(lineRef, network);
    if (resolved) {
      add({ from, to, lineId: resolved.id });
      continue;
    }
    // No/unknown line: block the hop on every line that carries it.
    for (const seg of network.segments) {
      if (seg.from === from && seg.to === to) {
        add({ from, to, lineId: seg.lineId });
      }
    }
  }

  return [...out.values()];
}

/** One concrete per-hop segment a journey traverses, in travel order. */
export interface ExpandedSegment {
  from: string;
  to: string;
  lineId: string;
  /** Index of the aggregated {@link JourneyLeg} this hop belongs to. */
  legIndex: number;
}

/**
 * Expand a journey into the ordered concrete network segments it traverses, in
 * travel order. Each aggregated line-ride leg is expanded back into its
 * per-hop segments using the matched line's ordered `stationIds`.
 *
 * Exported so the avoid-validation (task 7.2) and its Vitest test (task 7.3) can
 * reason about the exact hops a journey rides, rather than only its aggregated
 * legs.
 *
 * Returns `null` for a leg that cannot be expanded (endpoints not on the line,
 * or inverted order) — such a leg is simply skipped during expansion.
 */
export function journeySegments(
  journey: Journey,
  network: TransportNetwork,
): ExpandedSegment[] {
  const result: ExpandedSegment[] = [];

  journey.legs.forEach((leg: JourneyLeg, legIndex: number) => {
    const line = resolveLine(leg.line, network);
    if (!line) return;
    const fromIdx = line.stationIds.indexOf(leg.from);
    const toIdx = line.stationIds.indexOf(leg.to);
    if (fromIdx === -1 || toIdx === -1 || fromIdx > toIdx) return;
    for (let i = fromIdx; i < toIdx; i++) {
      result.push({
        from: line.stationIds[i],
        to: line.stationIds[i + 1],
        lineId: line.id,
        legIndex,
      });
    }
  });

  return result;
}

/**
 * Find the single "branch" segment of a journey to block in order to force the
 * next structurally distinct route: the FIRST segment the journey rides on a
 * line other than its first leg's line (i.e. the first hop after it first leaves
 * its initial line). Returns `null` when the journey never leaves its initial
 * line (single-line journeys have no alternative branch to open up).
 */
function firstBranchSegment(
  journey: Journey,
  network: TransportNetwork,
): BlockedSegment | null {
  if (journey.legs.length === 0) return null;
  const firstLegLine = resolveLine(journey.legs[0].line, network);
  const firstLineId = firstLegLine?.id;
  const segs = journeySegments(journey, network);
  for (const seg of segs) {
    if (seg.lineId !== firstLineId) {
      return { from: seg.from, to: seg.to, lineId: seg.lineId };
    }
  }
  return null;
}

/**
 * Structural signature of a journey used for de-duplication: the ordered list of
 * line-ride legs as `lineId:from->to`. Two journeys with identical ordered legs
 * share a signature and are treated as the same alternative.
 */
function journeySignature(journey: Journey, network: TransportNetwork): string {
  return journey.legs
    .map((leg) => {
      const line = resolveLine(leg.line, network);
      return `${line?.id ?? leg.line ?? ""}:${leg.from}->${leg.to}`;
    })
    .join("|");
}

function blockedKey(seg: BlockedSegment): string {
  return `${seg.from}\u0000${seg.to}\u0000${seg.lineId}`;
}

/**
 * Pure core: generate deterministic recovery alternatives that avoid the
 * disruptions' affected segments, planning against an explicit
 * {@link TransportNetwork}.
 *
 * See the module docstring for the blocked-segment computation, the iterative
 * edge-removal strategy that surfaces ≥2 distinct alternatives (Requirement
 * 5.2), the single-alternative case (Requirement 5.3 — only one is returned when
 * only one distinct avoiding route exists), and the labelling guarantees.
 *
 * @returns Distinct avoiding {@link Journey}s in a stable, deterministic order
 *   (total time ascending, then journey id). May be empty when no avoiding route
 *   exists (task 7.2 turns that into `NoAlternativeFound`).
 */
export function generateAlternativesOnNetwork(
  network: TransportNetwork,
  originId: string,
  destinationId: string,
  disruptions: ReadonlyArray<Disruption>,
): Journey[] {
  const disruptionBlocked = computeBlockedSegments(disruptions, network);

  // Accumulated extra blocks added by the edge-removal loop to force distinct
  // branches, keyed to avoid duplicates. Seeded empty; the disruption blocks are
  // always applied on top.
  const extraBlocked = new Map<string, BlockedSegment>();
  const seenSignatures = new Set<string>();
  const alternatives: Journey[] = [];

  for (let iteration = 0; iteration < MAX_ALTERNATIVES; iteration++) {
    const blockedSegments = [
      ...disruptionBlocked,
      ...extraBlocked.values(),
    ];

    const result = planJourneyOnNetwork(network, originId, destinationId, {
      blockedSegments,
    });

    if (isNoRouteFound(result)) break;
    const journey = result.journey;

    const signature = journeySignature(journey, network);
    const isNew = !seenSignatures.has(signature);
    if (isNew) {
      seenSignatures.add(signature);
      alternatives.push(journey);
    }

    // Decide the next branch to block so the subsequent plan is distinct.
    const branch = firstBranchSegment(journey, network);
    if (!branch) break; // single-line / no branch to open — nothing new to find.
    const key = blockedKey(branch);
    if (extraBlocked.has(key)) break; // already blocked this branch — converged.
    extraBlocked.set(key, branch);
  }

  // Stable, deterministic generation order (NOT a preference ranking — task 8).
  return alternatives.sort((a, b) => {
    if (a.totalTimeMin !== b.totalTimeMin) return a.totalTimeMin - b.totalTimeMin;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * DataProvider-backed entry point (Requirement 5.5).
 *
 * Reads the network via `provider.getNetwork()` and delegates to the pure
 * {@link generateAlternativesOnNetwork}. The caller supplies the active
 * disruptions (typically from `provider.getDisruptions()`), keeping the data
 * boundary explicit while the core stays pure.
 */
export function generateAlternatives(
  provider: DataProvider,
  originId: string,
  destinationId: string,
  disruptions: ReadonlyArray<Disruption>,
): Journey[] {
  return generateAlternativesOnNetwork(
    provider.getNetwork(),
    originId,
    destinationId,
    disruptions,
  );
}

// ── Task 7.2: avoid-validation + NoAlternativeFound ────────────────────────
//
// `generateAlternatives*` (task 7.1) already avoids the blocked segment(s) BY
// CONSTRUCTION — each alternative is planned with those segments in the
// planner's `blockedSegments` option, and the planner's search never traverses
// a blocked segment. The functions below add an explicit, independent SAFETY
// NET on top of that: they re-derive the blocked set, expand every generated
// alternative back into its concrete per-hop segments, and discard any
// alternative that is found to traverse a blocked hop. On the demo fixture this
// filter removes nothing (generation is already correct), but it is REAL
// validation — not a no-op — so a future planner/network change that leaked a
// blocked hop would be caught here rather than reaching the UI (Requirement
// 5.1, defensively). It then turns an empty validated set into an explicit
// `NoAlternativeFound` result (Requirement 5.4).
//
// `findRecovery` / `findRecoveryOnNetwork` are the VALIDATED entry point the UI
// and ranking (tasks 8, 10) should prefer. The raw `generateAlternatives*`
// functions are retained for callers that only need generation, but anything
// user-facing should go through `findRecovery*` so the avoid guarantee and the
// NoAlternativeFound case are enforced in one place.

/**
 * Discriminated result of a recovery attempt. Mirrors the Journey_Planner's
 * `PlanResult` shape so the two subsystems read consistently: either a
 * non-empty list of validated avoiding alternatives, or an explicit
 * `NoAlternativeFound` (Requirement 5.4).
 */
export type RecoveryResult =
  | { ok: true; alternatives: Journey[] }
  | { ok: false; reason: "NoAlternativeFound" };

/**
 * Convenience type guard for consumers, matching the planner's
 * {@link isNoRouteFound} style. Narrows a {@link RecoveryResult} to its
 * no-alternative branch.
 */
export function isNoAlternativeFound(
  result: RecoveryResult,
): result is { ok: false; reason: "NoAlternativeFound" } {
  return result.ok === false;
}

/**
 * Pure predicate: does `journey` avoid every blocked segment (Requirement 5.1)?
 *
 * Validation strategy — expansion + comparison:
 *   1. Expand `journey` into its ordered concrete per-hop segments via
 *      {@link journeySegments} (each aggregated line-ride leg becomes the
 *      individual `{ from, to, lineId }` hops it actually rides).
 *   2. Assert that NONE of those hops equals a blocked `{ from, to, lineId }`.
 *
 * Returns `true` when the journey rides no blocked hop (it avoids the blocked
 * part of the network), `false` as soon as one expanded hop matches a blocked
 * segment on all three of `from`, `to`, and `lineId`.
 */
export function journeyAvoidsBlocked(
  journey: Journey,
  blockedSegments: ReadonlyArray<BlockedSegment>,
  network: TransportNetwork,
): boolean {
  if (blockedSegments.length === 0) return true;
  const blockedKeys = new Set(blockedSegments.map(blockedKey));
  const hops = journeySegments(journey, network);
  for (const hop of hops) {
    if (blockedKeys.has(blockedKey(hop))) return false;
  }
  return true;
}

/**
 * Pure core: generate recovery alternatives (task 7.1), validate that each one
 * avoids every blocked segment, and return either the non-empty validated set
 * or an explicit `NoAlternativeFound` (Requirements 5.1, 5.4).
 *
 * The blocked set is re-derived here via {@link computeBlockedSegments} so the
 * validation is independent of however generation chose to avoid it. Any
 * alternative that (hypothetically) traverses a blocked hop is discarded by
 * {@link journeyAvoidsBlocked}. If the validated list is EMPTY, this returns
 * `{ ok: false, reason: "NoAlternativeFound" }`; otherwise
 * `{ ok: true, alternatives }` with ≥1 alternative (≥2 for the demo fixture),
 * in the same stable, deterministic order generation produced.
 */
export function findRecoveryOnNetwork(
  network: TransportNetwork,
  originId: string,
  destinationId: string,
  disruptions: ReadonlyArray<Disruption>,
): RecoveryResult {
  const blockedSegments = computeBlockedSegments(disruptions, network);

  const generated = generateAlternativesOnNetwork(
    network,
    originId,
    destinationId,
    disruptions,
  );

  const validated = generated.filter((journey) =>
    journeyAvoidsBlocked(journey, blockedSegments, network),
  );

  if (validated.length === 0) {
    return { ok: false, reason: "NoAlternativeFound" };
  }
  return { ok: true, alternatives: validated };
}

/**
 * DataProvider-backed validated entry point (Requirement 5.5).
 *
 * Reads the network via `provider.getNetwork()` and delegates to the pure
 * {@link findRecoveryOnNetwork}. The caller supplies the active disruptions
 * (typically from `provider.getDisruptions()`). This is the entry point the UI
 * and ranking should prefer over the raw {@link generateAlternatives}.
 */
export function findRecovery(
  provider: DataProvider,
  originId: string,
  destinationId: string,
  disruptions: ReadonlyArray<Disruption>,
): RecoveryResult {
  return findRecoveryOnNetwork(
    provider.getNetwork(),
    originId,
    destinationId,
    disruptions,
  );
}
