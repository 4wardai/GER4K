/**
 * Demo fare rules (Full Vision, Requirement 14) — DEMO FARE ESTIMATE.
 *
 * Not an official fare table. Rail fares come from per-segment `fareSen`
 * estimates in the fixture; these rules cover the rest. Ride-hailing values are
 * a generic demo price model, not any provider's pricing.
 */

import type { FareRules } from "@/types";

export const demoFareRules: FareRules = {
  busFlatSen: 100, // Rapid KL bus leg, demo estimate
  replacementBusSen: 0, // bridging/replacement bus, demo assumption: free
  railFallbackSenPerMin: 15, // only used if a rail segment lacks fareSen
  rideHail: {
    baseSen: 400,
    perKmSen: 120,
    perMinSen: 30,
    surgeMax: 1.5,
    roadFactor: 1.4,
    fastKmh: 22,
    slowKmh: 14,
    pickupMin: 4,
  },
};
