/**
 * Full Vision multimodal overlay (Requirement 18).
 *
 * These services are layered ON TOP of the CORE rail `demoNetwork` by
 * `MockDataProvider.getMultimodalNetwork()`. They are never part of
 * `getNetwork()`, so CORE planning, recovery and tests are unchanged.
 *
 * ── Provenance ─────────────────────────────────────────────────────────────
 *  - Rapid KL bus 300 ("Terminal Maluri ~ Lebuh Ampang") — official GTFS Static
 *    `rapid-bus-kl`: it stops at "LRT MASJID JAMEK" (KL1937, 7 m from the
 *    station) and later "KLCC (OPP)" (KL2301, ~118 m from KLCC station), about
 *    7 minutes apart, with a 5–10 minute weekday headway (frequencies.txt).
 *    Inspected at development time (scripts/data/extract_gtfs_reference.py).
 *  - Replacement bus TRX → Conlay → Persiaran KLCC — exists ONLY in the
 *    simulated Demo_Scenario (`isSimulated = true`). Rapid KL commonly runs
 *    bridging buses during rail disruptions, but this specific service is a
 *    demo construct and is labelled simulated.
 *  - Walk link Persiaran KLCC ↔ KLCC — walking estimate (ESTIMATED).
 *
 * Times, walks and transfer waits are demo estimates. Bus boarding transfer
 * time includes an expected wait of roughly half the headway.
 */

import type {
  NetworkInterchange,
  NetworkLine,
  NetworkSegment,
  WalkLink,
} from "@/types";
import { LINE_IDS, STATION_IDS } from "./fixture";

export const MULTIMODAL_LINE_IDS = {
  bus300: "rapidkl-bus-300",
  replacementBus: "replacement-bus-trx-pkl",
} as const;

// ── Always-on services (official GTFS-backed) ───────────────────────────────

export const busLines: NetworkLine[] = [
  {
    id: MULTIMODAL_LINE_IDS.bus300,
    name: "Rapid KL bus 300",
    mode: "Rapid KL Bus",
    kind: "bus",
    shortName: "300",
    headwayMin: 7, // GTFS weekday headway 5–10 min
    stationIds: [STATION_IDS.masjidJamek, STATION_IDS.klcc],
  },
];

export const busSegments: NetworkSegment[] = [
  {
    // LRT Masjid Jamek stop → KLCC (OPP) stop ≈ 7 min (GTFS), + ~2 min walk to KLCC.
    from: STATION_IDS.masjidJamek,
    to: STATION_IDS.klcc,
    lineId: MULTIMODAL_LINE_IDS.bus300,
    mode: "Rapid KL Bus",
    travelTimeMin: 9, // demo estimate from GTFS stop times + egress walk
    walkMeters: 120, // KLCC (OPP) stop → KLCC station, walking estimate
  },
];

export const busInterchanges: NetworkInterchange[] = [
  {
    // Ampang / Sri Petaling Line platform → bus 300 stop at Masjid Jamek.
    stationId: STATION_IDS.masjidJamek,
    fromLineId: LINE_IDS.ampangSriPetaling,
    toLineId: MULTIMODAL_LINE_IDS.bus300,
    walkMeters: 60, // demo estimate
    transferTimeMin: 5, // ~1 min walk + ~4 min expected wait
  },
];

// ── Scenario-only services (simulated) ──────────────────────────────────────

export const scenarioLines: NetworkLine[] = [
  {
    id: MULTIMODAL_LINE_IDS.replacementBus,
    name: "Replacement bus",
    mode: "Replacement Bus",
    kind: "replacement-bus",
    shortName: "Bridging bus",
    headwayMin: 10,
    isSimulated: true,
    stationIds: [STATION_IDS.trx, STATION_IDS.conlay, STATION_IDS.persiaranKlcc],
  },
];

export const scenarioSegments: NetworkSegment[] = [
  {
    from: STATION_IDS.trx,
    to: STATION_IDS.conlay,
    lineId: MULTIMODAL_LINE_IDS.replacementBus,
    mode: "Replacement Bus",
    travelTimeMin: 6, // simulated road time
    walkMeters: 0,
  },
  {
    from: STATION_IDS.conlay,
    to: STATION_IDS.persiaranKlcc,
    lineId: MULTIMODAL_LINE_IDS.replacementBus,
    mode: "Replacement Bus",
    travelTimeMin: 5, // simulated road time
    walkMeters: 0,
  },
];

export const scenarioInterchanges: NetworkInterchange[] = [
  {
    // Putrajaya Line platform at TRX → street-level replacement bus stop.
    stationId: STATION_IDS.trx,
    fromLineId: LINE_IDS.putrajaya,
    toLineId: MULTIMODAL_LINE_IDS.replacementBus,
    walkMeters: 200, // demo estimate
    transferTimeMin: 8, // ~3 min walk + ~5 min expected wait (10-min headway)
  },
];

// ── Walking connections ─────────────────────────────────────────────────────

export const walkLinks: WalkLink[] = [
  {
    from: STATION_IDS.persiaranKlcc,
    to: STATION_IDS.klcc,
    walkMeters: 700, // walking estimate
    walkTimeMin: 11, // walking estimate
  },
];
