/**
 * Ride-hail fallback estimator (Requirement 23) — DEMO PRICE ESTIMATE.
 *
 * Rail from the origin to the last unaffected station before the blocked
 * segment (the disruption's `from` station), then a ride-hail to the
 * destination. Distances use official GTFS coordinates (haversine × road
 * factor). Never ranked; never the default; no provider integration implied.
 */

import type {
  Disruption,
  FareRules,
  RideHailEstimate,
  TransportNetwork,
} from "@/types";
import type { BlockedSegment } from "@/domain/recovery";
import { planJourneyOnNetwork } from "@/domain/transport";
import { computeJourneyFare } from "@/domain/fare";

/** Great-circle distance in km between two lat/lon points. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function roundToRinggit(sen: number): number {
  return Math.round(sen / 100) * 100;
}

export interface RideHailInput {
  network: TransportNetwork;
  originId: string;
  destinationId: string;
  disruptions: ReadonlyArray<Disruption>;
  blocked: ReadonlyArray<BlockedSegment>;
  fareRules: FareRules;
}

export function estimateRideHailFallback(input: RideHailInput): RideHailEstimate | null {
  const { network, originId, destinationId, disruptions, blocked, fareRules } = input;
  const rules = fareRules.rideHail;

  for (const d of disruptions) {
    const hailId = d.affectedSegment.from;
    if (hailId === destinationId || hailId === originId) continue;
    const hail = network.stations.find((s) => s.id === hailId);
    const dest = network.stations.find((s) => s.id === destinationId);
    if (!hail?.lat || !hail.lon || !dest?.lat || !dest.lon) continue;

    const rail = planJourneyOnNetwork(network, originId, hailId, {
      blockedSegments: [...blocked],
    });
    if (!rail.ok) continue;

    const roadKm =
      Math.round(haversineKm({ lat: hail.lat, lon: hail.lon }, { lat: dest.lat, lon: dest.lon }) * rules.roadFactor * 10) / 10;
    const rideLow = Math.max(3, Math.round((roadKm / rules.fastKmh) * 60));
    const rideHigh = Math.max(rideLow + 2, Math.round((roadKm / rules.slowKmh) * 60));
    const priceLow = roundToRinggit(rules.baseSen + rules.perKmSen * roadKm + rules.perMinSen * rideLow);
    const priceHigh = roundToRinggit(
      (rules.baseSen + rules.perKmSen * roadKm + rules.perMinSen * rideHigh) * rules.surgeMax,
    );
    const railFareSen = computeJourneyFare(rail.journey, network, fareRules).totalSen;
    const railMin = rail.journey.totalTimeMin + rules.pickupMin;

    return {
      hailStationId: hailId,
      destinationId,
      railJourney: rail.journey,
      railFareSen,
      roadKm,
      rideMinRange: [rideLow, rideHigh],
      totalMinRange: [railMin + rideLow, railMin + rideHigh],
      rideCostSenRange: [priceLow, priceHigh],
      totalCostSenRange: [railFareSen + priceLow, railFareSen + priceHigh],
      sourceStatus: "ESTIMATED",
      isSimulated: false,
    };
  }
  return null;
}
