/**
 * Fare_Engine — pure, framework-free journey cost estimate (Requirement 14).
 *
 * Produces a {@link JourneyFare} with a total and a breakdown. Every fare is a
 * DEMO FARE ESTIMATE: `sourceStatus = "ESTIMATED"`, `isSimulated = false`.
 *
 * Rules (design "Fare_Engine"):
 *  - Consecutive rail legs form ONE integrated rail fare item — the sum of the
 *    `fareSen` of every hop ridden (approximates Rapid KL distance-based fares
 *    inside the paid area). A hop without `fareSen` falls back to
 *    `railFallbackSenPerMin × travelTimeMin`.
 *  - A Rapid KL bus leg costs the flat `busFlatSen`.
 *  - A replacement-bus leg costs `replacementBusSen` (demo assumption: free).
 *  - Walk legs cost nothing; ride-hail legs are priced separately by the
 *    ride-hail estimator, never here.
 */

import type {
  FareItem,
  FareRules,
  Journey,
  JourneyFare,
  NetworkLine,
  NetworkSegment,
  TransportNetwork,
} from "@/types";

/** Resolve the network line a leg rides (by lineId, id or display name). */
export function resolveLegLine(
  leg: { lineId?: string; line?: string },
  network: TransportNetwork,
): NetworkLine | undefined {
  const ref = leg.lineId ?? leg.line;
  if (!ref) return undefined;
  return (
    network.lines.find((l) => l.id === ref) ??
    network.lines.find((l) => l.name === ref)
  );
}

/**
 * The concrete segments a ride leg uses. A leg that matches a single direct
 * segment (e.g. Pasar Seni → KLCC on Kelana Jaya) uses it; otherwise the leg is
 * walked hop-by-hop along the line's station order.
 */
export function legSegments(
  leg: { from: string; to: string },
  line: NetworkLine,
  network: TransportNetwork,
): NetworkSegment[] {
  const direct = network.segments.find(
    (s) => s.lineId === line.id && s.from === leg.from && s.to === leg.to,
  );
  if (direct) return [direct];

  const fromIdx = line.stationIds.indexOf(leg.from);
  const toIdx = line.stationIds.indexOf(leg.to);
  if (fromIdx === -1 || toIdx === -1 || fromIdx >= toIdx) return [];
  const out: NetworkSegment[] = [];
  for (let i = fromIdx; i < toIdx; i++) {
    const seg = network.segments.find(
      (s) =>
        s.lineId === line.id &&
        s.from === line.stationIds[i] &&
        s.to === line.stationIds[i + 1],
    );
    if (seg) out.push(seg);
  }
  return out;
}

/** Format sen as "RM4.20". */
export function formatRinggit(sen: number): string {
  return `RM${(sen / 100).toFixed(2)}`;
}

/**
 * Compute the fare estimate for a journey against the (multimodal) network.
 * Pure and deterministic.
 */
export function computeJourneyFare(
  journey: Journey,
  network: TransportNetwork,
  rules: FareRules,
): JourneyFare {
  const items: FareItem[] = [];
  let rail: FareItem | null = null;

  const closeRail = () => {
    if (rail) items.push(rail);
    rail = null;
  };

  journey.legs.forEach((leg, index) => {
    if (leg.legKind === "walk" || leg.legKind === "ride-hail") {
      // Walking keeps you outside the vehicle; a walk ends the paid-area ride.
      closeRail();
      return;
    }
    const line = resolveLegLine(leg, network);
    const kind = line?.kind ?? "rail";

    if (kind === "bus") {
      closeRail();
      items.push({
        label: line?.shortName ? `Rapid KL bus ${line.shortName}` : "Rapid KL bus",
        amountSen: rules.busFlatSen,
        legIndexes: [index],
        note: "Flat bus fare (demo estimate)",
      });
      return;
    }
    if (kind === "replacement-bus") {
      closeRail();
      items.push({
        label: "Replacement bus",
        amountSen: rules.replacementBusSen,
        legIndexes: [index],
        note: "Free bridging service (demo assumption)",
      });
      return;
    }

    // Rail: accumulate into one integrated fare while legs stay on rail.
    const segs = line ? legSegments(leg, line, network) : [];
    const amount =
      segs.length > 0
        ? segs.reduce(
            (sum, s) =>
              sum + (s.fareSen ?? rules.railFallbackSenPerMin * s.travelTimeMin),
            0,
          )
        : rules.railFallbackSenPerMin * leg.travelTimeMin;
    if (!rail) {
      rail = {
        label: "Rail fare (integrated)",
        amountSen: 0,
        legIndexes: [],
        note: "MRT/LRT changes inside the paid area share one fare (demo estimate)",
      };
    }
    (rail as FareItem).amountSen += amount;
    (rail as FareItem).legIndexes.push(index);
  });
  closeRail();

  return {
    totalSen: items.reduce((sum, i) => sum + i.amountSen, 0),
    items,
    sourceStatus: "ESTIMATED",
    isSimulated: false,
  };
}
