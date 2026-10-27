/**
 * Journey_Options_Engine — pure, framework-free multimodal journey options for
 * normal days AND recovery (Requirements 15, 18, 22).
 *
 * It does NOT re-implement pathfinding: every candidate is produced by the CORE
 * {@link planJourneyOnNetwork}. It does NOT re-implement ranking: ordering comes
 * from the CORE {@link rankAlternatives}. It does NOT re-implement recovery
 * validation: recovery candidates must pass the CORE {@link journeyAvoidsBlocked},
 * and the CORE {@link findRecoveryOnNetwork} result is always unioned in so the
 * documented Alt A / Alt B are guaranteed to be present.
 *
 * Pipeline (design "Journey_Options_Engine"):
 *  1. Endpoints — origin/destination plus one walk link for access/egress.
 *  2. Enumerate — deterministic, breadth-first segment-removal search: plan, then
 *     for each hop of the found route re-plan with that hop also blocked (depth
 *     ≤ 2, bounded plans/candidates), de-duplicated by leg signature.
 *  3. Recovery — the blocked set is the CORE `computeBlockedSegments`; every
 *     candidate must avoid it.
 *  4. Relabel — legs on simulated services become UNVERIFIED + simulated; walk
 *     legs are ESTIMATED. Legs gain `lineId` / `headwayMin`.
 *  5. Enrich — fare, touch stations, crowd level, access issues, confidence,
 *     stable unique id, passenger title.
 *  6. Pareto filter → CORE ranking → meaningful set (strategy winners ∪ each
 *     profile's top choice), capped at {@link MAX_PRESENTED}.
 */

import type {
  CommunityReport,
  Disruption,
  FareRules,
  Journey,
  JourneyLeg,
  JourneyOption,
  JourneyOptionsResult,
  NetworkLine,
  PreferenceProfile,
  StationPulseDetail,
  StrategyTag,
  TransportNetwork,
  WalkLink,
} from "@/types";
import { PREFERENCE_PROFILES } from "@/types";
import { planJourneyOnNetwork } from "@/domain/transport";
import {
  computeBlockedSegments,
  findRecoveryOnNetwork,
  journeyAvoidsBlocked,
  rankAlternatives,
} from "@/domain/recovery";
import type { BlockedSegment } from "@/domain/recovery";
import { computeConfidence } from "@/domain/confidence";
import { computeJourneyFare, legSegments, resolveLegLine } from "@/domain/fare";
import {
  ACCESS_ISSUE_TYPES,
  aggregateStationPulse,
  CONDITION_SEVERITY,
} from "@/domain/community";
import { estimateRideHailFallback } from "./rideHail";

/** Bounds for the deterministic enumeration (fixture-sized network). */
export const MAX_PLANS = 40;
export const MAX_CANDIDATES = 12;
export const MAX_DEPTH = 2;
/** Max options presented to the passenger. */
export const MAX_PRESENTED = 4;

export interface BuildJourneyOptionsInput {
  /** Multimodal network (CORE rail + buses + walk links [+ scenario services]). */
  network: TransportNetwork;
  /** CORE rail network, used to union in the CORE findRecovery result. */
  coreNetwork?: TransportNetwork;
  originId: string;
  destinationId: string;
  /** Active disruptions. Empty on a normal day. */
  disruptions: ReadonlyArray<Disruption>;
  /** Station pulse details keyed by station id. */
  pulseByStation: ReadonlyMap<string, StationPulseDetail>;
  fareRules: FareRules;
  profile: PreferenceProfile;
  stationName: (id: string) => string;
  /**
   * Whether this is recovery mode. Defaults to "any active disruption". The UI
   * passes the CORE Disruption_Monitor result (is the usual route affected?) so
   * an unaffected trip stays in normal mode while blocked segments are still
   * avoided.
   */
  isRecovery?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function lineById(network: TransportNetwork, id: string | undefined): NetworkLine | undefined {
  return id ? network.lines.find((l) => l.id === id) : undefined;
}

function blockedKey(b: BlockedSegment): string {
  return `${b.from}\u0000${b.to}\u0000${b.lineId}`;
}

/** Structural signature of a journey (ordered legs incl. walk legs). */
export function journeySignature(journey: Journey): string {
  return journey.legs
    .map((l) =>
      l.legKind === "walk"
        ? `walk:${l.from}->${l.to}`
        : `${l.lineId ?? l.line ?? l.mode}:${l.from}->${l.to}`,
    )
    .join("|");
}

function hashString(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

/** The concrete hops a journey rides, for the enumeration's next blocks. */
function ridden(journey: Journey, network: TransportNetwork): BlockedSegment[] {
  const out: BlockedSegment[] = [];
  for (const leg of journey.legs) {
    if (leg.legKind === "walk" || leg.legKind === "ride-hail") continue;
    const line = resolveLegLine(leg, network);
    if (!line) continue;
    for (const s of legSegments(leg, line, network)) {
      out.push({ from: s.from, to: s.to, lineId: s.lineId });
    }
  }
  return out;
}

/**
 * Deterministic breadth-first segment-removal enumeration over the CORE planner.
 * Returns distinct journeys from `originId` to `destinationId` avoiding
 * `baseBlocked`.
 */
export function enumerateRoutes(
  network: TransportNetwork,
  originId: string,
  destinationId: string,
  baseBlocked: ReadonlyArray<BlockedSegment>,
): Journey[] {
  const results: Journey[] = [];
  const signatures = new Set<string>();
  const queue: BlockedSegment[][] = [[]];
  const seen = new Set<string>([""]);
  let plans = 0;

  while (queue.length > 0 && plans < MAX_PLANS && results.length < MAX_CANDIDATES) {
    const extra = queue.shift() as BlockedSegment[];
    plans += 1;
    const plan = planJourneyOnNetwork(network, originId, destinationId, {
      blockedSegments: [...baseBlocked, ...extra],
    });
    if (!plan.ok || plan.journey.legs.length === 0) continue;

    const sig = journeySignature(plan.journey);
    if (!signatures.has(sig)) {
      signatures.add(sig);
      results.push(plan.journey);
    }
    if (extra.length >= MAX_DEPTH) continue;

    for (const hop of ridden(plan.journey, network)) {
      const next = [...extra, hop];
      const key = next.map(blockedKey).sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return results;
}

function walkNeighbours(
  links: ReadonlyArray<WalkLink>,
  stationId: string,
): Array<{ other: string; link: WalkLink }> {
  const out: Array<{ other: string; link: WalkLink }> = [];
  for (const link of links) {
    if (link.from === stationId) out.push({ other: link.to, link });
    else if (link.to === stationId) out.push({ other: link.from, link });
  }
  return out;
}

function walkLeg(from: string, to: string, link: WalkLink): JourneyLeg {
  return {
    from,
    to,
    mode: "Walk",
    legKind: "walk",
    travelTimeMin: link.walkTimeMin,
    walkMeters: link.walkMeters,
    sourceStatus: "ESTIMATED",
    isSimulated: false,
  };
}

/** Wrap a station-to-station journey with optional access/egress walk legs. */
function withWalks(
  journey: Journey,
  access: { leg: JourneyLeg } | null,
  egress: { leg: JourneyLeg } | null,
): Journey {
  const legs = [
    ...(access ? [access.leg] : []),
    ...journey.legs,
    ...(egress ? [egress.leg] : []),
  ];
  const extraTime = (access?.leg.travelTimeMin ?? 0) + (egress?.leg.travelTimeMin ?? 0);
  const extraWalk = (access?.leg.walkMeters ?? 0) + (egress?.leg.walkMeters ?? 0);
  return {
    ...journey,
    legs,
    totalTimeMin: journey.totalTimeMin + extraTime,
    totalWalkMeters: journey.totalWalkMeters + extraWalk,
  };
}

/** Attach lineId/headway and honest labels to every leg (step 4). */
function relabel(journey: Journey, network: TransportNetwork): Journey {
  let anySimulated = false;
  const legs = journey.legs.map((leg) => {
    if (leg.legKind === "walk" || leg.legKind === "ride-hail") return leg;
    const line = resolveLegLine(leg, network);
    if (!line) return leg;
    const simulated = line.isSimulated === true;
    if (simulated) anySimulated = true;
    return {
      ...leg,
      lineId: line.id,
      ...(line.headwayMin ? { headwayMin: line.headwayMin } : {}),
      ...(simulated ? { sourceStatus: "UNVERIFIED" as const, isSimulated: true } : {}),
    };
  });
  return { ...journey, legs, isSimulated: journey.isSimulated || anySimulated };
}

/** Stations where the passenger boards, transfers or alights (ride legs only). */
export function touchStations(journey: Journey): string[] {
  const out: string[] = [];
  const push = (id: string) => {
    if (out[out.length - 1] !== id && !out.includes(id)) out.push(id);
  };
  for (const leg of journey.legs) {
    if (leg.legKind === "walk") continue;
    push(leg.from);
    push(leg.to);
  }
  return out;
}

/** Every station along the path, including pass-through stops. */
export function pathStations(journey: Journey, network: TransportNetwork): string[] {
  const out: string[] = [];
  const push = (id: string) => {
    if (out[out.length - 1] !== id) out.push(id);
  };
  for (const leg of journey.legs) {
    push(leg.from);
    if (leg.legKind !== "walk" && leg.legKind !== "ride-hail") {
      const line = resolveLegLine(leg, network);
      if (line) for (const s of legSegments(leg, line, network)) push(s.to);
    }
    push(leg.to);
  }
  return out;
}

function lineKindOf(leg: JourneyLeg, network: TransportNetwork) {
  return resolveLegLine(leg, network)?.kind ?? "rail";
}

/** Passenger title, e.g. "via TRX + Pasar Seni" (design "Titles"). */
export function optionTitle(
  journey: Journey,
  network: TransportNetwork,
  stationName: (id: string) => string,
): string {
  const rides = journey.legs.filter((l) => l.legKind !== "walk" && l.legKind !== "ride-hail");
  const hasWalk = journey.legs.some((l) => l.legKind === "walk");
  if (rides.length === 0) return "Walk";
  if (rides.length === 1) {
    const line = resolveLegLine(rides[0], network);
    const name = line?.kind === "bus" ? `bus ${line.shortName ?? line.name}` : rides[0].line ?? rides[0].mode;
    return hasWalk ? `${name} + walk` : `Direct on ${name}`;
  }
  const parts: string[] = [];
  for (let i = 1; i < rides.length; i++) {
    const leg = rides[i];
    const kind = lineKindOf(leg, network);
    const station = stationName(leg.from);
    if (kind === "bus") {
      const line = resolveLegLine(leg, network);
      parts.push(`bus ${line?.shortName ?? ""} from ${station}`.replace(/\s+/g, " "));
    } else if (kind === "replacement-bus") {
      parts.push(`replacement bus from ${station}`);
    } else if (!parts.includes(station)) {
      parts.push(station);
    }
  }
  return `via ${parts.join(" + ")}`;
}

interface Attributes {
  time: number;
  transfers: number;
  walk: number;
  fare: number;
  crowd: number;
  access: number;
}

function attributes(j: Journey): Attributes {
  return {
    time: j.totalTimeMin,
    transfers: j.transfers,
    walk: j.totalWalkMeters,
    fare: j.fareSen ?? 0,
    crowd: j.crowdLevel ?? 0,
    access: j.accessIssues ?? 0,
  };
}

const ATTR_KEYS: Array<keyof Attributes> = ["time", "transfers", "walk", "fare", "crowd", "access"];

/** True when `a` is dominated by `b` (b ≤ a everywhere and < somewhere). */
function isDominated(a: Attributes, b: Attributes): boolean {
  let strictlyBetter = false;
  for (const k of ATTR_KEYS) {
    if (b[k] > a[k]) return false;
    if (b[k] < a[k]) strictlyBetter = true;
  }
  return strictlyBetter;
}

/** Remove dominated options (design step 6). Stable order. */
export function paretoFilter<T extends { journey: Journey }>(options: T[]): T[] {
  return options.filter(
    (o) =>
      !options.some(
        (other) => other !== o && isDominated(attributes(o.journey), attributes(other.journey)),
      ),
  );
}

const STRATEGY_ATTRS: Array<{ tag: StrategyTag; key: keyof Attributes }> = [
  { tag: "Fastest", key: "time" },
  { tag: "Cheapest", key: "fare" },
  { tag: "Least walking", key: "walk" },
  { tag: "Fewest changes", key: "transfers" },
  { tag: "Least crowded", key: "crowd" },
];

/** Strategy tags among a set: strict minima; an attribute equal for all tags nobody. */
export function strategyTags(journeys: Journey[]): Map<Journey, StrategyTag[]> {
  const tags = new Map<Journey, StrategyTag[]>(journeys.map((j) => [j, []]));
  if (journeys.length < 2) return tags;
  for (const { tag, key } of STRATEGY_ATTRS) {
    const values = journeys.map((j) => attributes(j)[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) continue;
    journeys.forEach((j, i) => {
      if (values[i] === min) tags.get(j)?.push(tag);
    });
  }
  return tags;
}

// ── Main entry point ───────────────────────────────────────────────────────

/** Build ranked, meaningful journey options for an origin/destination. */
export function buildJourneyOptions(input: BuildJourneyOptionsInput): JourneyOptionsResult {
  const {
    network,
    coreNetwork,
    originId,
    destinationId,
    disruptions,
    pulseByStation,
    fareRules,
    profile,
    stationName,
  } = input;

  const recovery = input.isRecovery ?? disruptions.length > 0;
  const blocked = computeBlockedSegments(disruptions, network);
  const links = network.walkLinks ?? [];

  // 1–2. Endpoints + enumeration.
  const starts: Array<{ station: string; access: { leg: JourneyLeg } | null }> = [
    { station: originId, access: null },
    ...walkNeighbours(links, originId).map(({ other, link }) => ({
      station: other,
      access: { leg: walkLeg(originId, other, link) },
    })),
  ];
  const ends: Array<{ station: string; egress: { leg: JourneyLeg } | null }> = [
    { station: destinationId, egress: null },
    ...walkNeighbours(links, destinationId).map(({ other, link }) => ({
      station: other,
      egress: { leg: walkLeg(other, destinationId, link) },
    })),
  ];

  const raw: Journey[] = [];
  for (const s of starts) {
    for (const e of ends) {
      if (s.station === e.station) continue;
      if (s.access && e.egress) continue; // at most one walk connection
      for (const j of enumerateRoutes(network, s.station, e.station, blocked)) {
        raw.push(withWalks(j, s.access, e.egress));
      }
    }
  }

  // 3. Union the CORE recovery result (guarantees Alt A / Alt B).
  if (recovery && coreNetwork) {
    const core = findRecoveryOnNetwork(coreNetwork, originId, destinationId, disruptions);
    if (core.ok) raw.push(...core.alternatives);
  }

  // De-duplicate + validate against the blocked set.
  const unique = new Map<string, Journey>();
  for (const j of raw) {
    const relabelled = relabel(j, network);
    const sig = journeySignature(relabelled);
    if (unique.has(sig)) continue;
    if (blocked.length > 0 && !journeyAvoidsBlocked(relabelled, blocked, network)) continue;
    unique.set(sig, relabelled);
  }

  // 5. Enrich.
  const candidates: JourneyOption[] = [...unique.entries()].map(([sig, j]) => {
    const fare = computeJourneyFare(j, network, fareRules);
    const touch = touchStations(j);
    const summaries = touch
      .map((id) => pulseByStation.get(id)?.summary)
      .filter((s): s is NonNullable<typeof s> => !!s);
    const crowdLevel = summaries.reduce(
      (max, s) => (s.reportCount > 0 ? Math.max(max, CONDITION_SEVERITY[s.condition]) : max),
      0,
    );
    const accessIssues = touch.filter((id) =>
      pulseByStation.get(id)?.signals.some((sig) => ACCESS_ISSUE_TYPES.has(sig.type)),
    ).length;
    const id = `opt-${hashString(sig)}`;
    const journey: Journey = {
      ...j,
      id,
      fareSen: fare.totalSen,
      crowdLevel,
      accessIssues,
    };
    return {
      id,
      title: optionTitle(journey, network, stationName),
      journey,
      fare,
      confidence: computeConfidence(journey, { routePulse: summaries }),
      strategies: [],
      rank: 0,
      touchStationIds: touch,
      pathStationIds: pathStations(journey, network),
      hasBus: journey.legs.some((l) => {
        const kind = lineKindOf(l, network);
        return l.legKind !== "walk" && (kind === "bus" || kind === "replacement-bus");
      }),
      isSimulated: journey.isSimulated,
    };
  });

  // 6. Pareto → rank → meaningful.
  const nonDominated = paretoFilter(candidates);
  const byJourney = new Map(nonDominated.map((o) => [o.journey, o]));
  const ranked = rankAlternatives(
    nonDominated.map((o) => o.journey),
    profile,
  ).map((j) => byJourney.get(j) as JourneyOption);

  const tags = strategyTags(nonDominated.map((o) => o.journey));
  const meaningfulIds = new Set<string>();
  for (const o of nonDominated) {
    if ((tags.get(o.journey) ?? []).length > 0) meaningfulIds.add(o.id);
  }
  for (const p of PREFERENCE_PROFILES) {
    const top = rankAlternatives(nonDominated.map((o) => o.journey), p)[0];
    if (top) meaningfulIds.add(top.id);
  }
  if (ranked[0]) meaningfulIds.add(ranked[0].id);

  const options = ranked
    .filter((o) => meaningfulIds.has(o.id))
    .slice(0, MAX_PRESENTED)
    .map((o, i) => ({ ...o, rank: i + 1, strategies: tags.get(o.journey) ?? [] }));

  // Ride-hail fallback — recovery only, never ranked.
  const rideHail =
    recovery && options.length > 0
      ? estimateRideHailFallback({
          network,
          originId,
          destinationId,
          disruptions,
          blocked,
          fareRules,
        })
      : null;

  return {
    mode: recovery ? "recovery" : "normal",
    profile,
    options,
    candidates: candidates.map((c) => ({
      ...c,
      strategies: options.find((o) => o.id === c.id)?.strategies ?? [],
    })),
    rideHail,
  };
}

/** Compute station pulse details for a set of stations from raw reports. */
export function pulseDetailsFor(
  stationIds: ReadonlyArray<string>,
  reportsFor: (stationId: string) => CommunityReport[],
  now: number = Date.now(),
): Map<string, StationPulseDetail> {
  const map = new Map<string, StationPulseDetail>();
  for (const id of stationIds) map.set(id, aggregateStationPulse(id, reportsFor(id), now));
  return map;
}

export { lineById };
