/**
 * GER4K corrected demo fixture — the single source of truth for the demo.
 *
 * This is a predictable, LOCAL, offline fixture. It does NOT invent rail data:
 * every station, line, and interchange below is a well-known, geographically
 * real Klang Valley rail relationship. It intentionally models ONLY the
 * stations the demo scenario needs — NOT the whole Klang Valley network.
 *
 * ── Data provenance & labelling ───────────────────────────────────────────
 * Network/schedule-derived records (lines, segments, interchanges and the legs
 * built from them) represent official static/scheduled information and are
 * therefore labelled `sourceStatus = "SCHEDULED"`, `isSimulated = false` at the
 * point they become journey legs (see MockDataProvider / the domain layer).
 *
 * The travel-time (`travelTimeMin` / `transferTimeMin`) and walking
 * (`walkMeters`) VALUES in this fixture are **demo fixture estimates**. They
 * were NOT extracted from an official schedule — they are plausible, tuned
 * estimates chosen so the recovery alternatives have meaningful trade-offs (see
 * the per-route totals documented below). Every such value is marked with a
 * `// demo fixture estimate` comment. Segment `fareSen` values (Full Vision) are
 * likewise **demo fare estimates**, not an official fare table.
 *
 * ── GTFS attribution note (development-time only) ──────────────────────────
 * Station names, line memberships, interchange relationships, station codes,
 * coordinates and `isOKU` flags are taken from Malaysia's official GTFS Static
 * feed (category `rapid-rail-kl`, https://developer.data.gov.my/realtime-api/gtfs-static,
 * licensed CC BY 4.0), inspected at DEVELOPMENT time (see
 * `scripts/data/extract_gtfs_reference.py`). It is NOT fetched or parsed at
 * runtime — the demo works fully offline and GER4K ships NO GTFS parser.
 *
 * ── Real KL rail relationships (keep the fixture honest) ───────────────────
 *  - MRT Putrajaya Line: Putrajaya Sentral … Chan Sow Lin (PY24), TRX (PY23),
 *    Conlay (PY22), Persiaran KLCC (PY21), Ampang Park (PY20).
 *  - MRT Kajang Line: TRX (KG20), Bukit Bintang (KG18A), Merdeka (KG17),
 *    Pasar Seni (KG16).
 *  - LRT Kelana Jaya Line: Pasar Seni, Masjid Jamek, KLCC, Ampang Park.
 *  - LRT Ampang / Sri Petaling Line: Chan Sow Lin, Masjid Jamek.
 *
 * ── Full Vision additions (additive; CORE totals unchanged) ────────────────
 *  - Persiaran KLCC, Bukit Bintang and Merdeka are inserted on their real lines
 *    by SPLITTING existing segments, so baseline 28/1/180, Alt A 34/2/520 and
 *    Alt B 41/2/260 are unchanged.
 *  - Pulse seeds are stored as minutes-ago OFFSETS and materialised relative to
 *    "now" on every read, so they never age out of the 30-min window during a
 *    long demo session.
 */

import type {
  Station,
  NetworkLine,
  NetworkSegment,
  NetworkInterchange,
  TransportNetwork,
  Disruption,
  CommunityReport,
  StationCondition,
  StationReportType,
} from "@/types";

// ── Station ids ─────────────────────────────────────────────────────────────
export const STATION_IDS = {
  putrajayaSentral: "putrajaya-sentral",
  chanSowLin: "chan-sow-lin",
  trx: "trx",
  conlay: "conlay",
  persiaranKlcc: "persiaran-klcc",
  ampangPark: "ampang-park",
  pasarSeni: "pasar-seni",
  merdeka: "merdeka",
  bukitBintang: "bukit-bintang",
  masjidJamek: "masjid-jamek",
  klcc: "klcc",
} as const;

// ── Line ids ──────────────────────────────────────────────────────────────
export const LINE_IDS = {
  putrajaya: "putrajaya-line",
  kelanaJaya: "kelana-jaya-line",
  kajang: "kajang-line",
  ampangSriPetaling: "ampang-sri-petaling-line",
} as const;

/** Demo origin/destination for the baseline journey. */
export const DEMO_ORIGIN_ID = STATION_IDS.putrajayaSentral;
export const DEMO_DESTINATION_ID = STATION_IDS.klcc;

// ── Stations ────────────────────────────────────────────────────────────────
// Codes, coordinates and isOKU from official GTFS Static `rapid-rail-kl`.
const stations: Station[] = [
  {
    id: STATION_IDS.putrajayaSentral,
    name: "Putrajaya Sentral",
    lines: [LINE_IDS.putrajaya],
    codes: ["PY41"],
    lat: 2.9313,
    lon: 101.6715,
    isOKU: true,
  },
  {
    id: STATION_IDS.chanSowLin,
    name: "Chan Sow Lin",
    // Real interchange: Putrajaya Line <-> Ampang / Sri Petaling Line.
    lines: [LINE_IDS.putrajaya, LINE_IDS.ampangSriPetaling],
    codes: ["PY24", "AG11", "SP11"],
    lat: 3.12839,
    lon: 101.71663,
    isOKU: true,
  },
  {
    id: STATION_IDS.trx,
    name: "TRX",
    // Real interchange: Putrajaya Line <-> Kajang Line (Tun Razak Exchange).
    lines: [LINE_IDS.putrajaya, LINE_IDS.kajang],
    codes: ["PY23", "KG20"],
    lat: 3.14289,
    lon: 101.72034,
    isOKU: true,
  },
  {
    id: STATION_IDS.conlay,
    name: "Conlay",
    lines: [LINE_IDS.putrajaya],
    codes: ["PY22"],
    lat: 3.15145,
    lon: 101.71801,
    isOKU: true,
  },
  {
    id: STATION_IDS.persiaranKlcc,
    name: "Persiaran KLCC",
    lines: [LINE_IDS.putrajaya],
    codes: ["PY21"],
    lat: 3.15712,
    lon: 101.71834,
    isOKU: true,
  },
  {
    id: STATION_IDS.ampangPark,
    name: "Ampang Park",
    // Real interchange: Putrajaya Line <-> Kelana Jaya Line.
    lines: [LINE_IDS.putrajaya, LINE_IDS.kelanaJaya],
    codes: ["PY20", "KJ9"],
    lat: 3.16225,
    lon: 101.71781,
    isOKU: true,
  },
  {
    id: STATION_IDS.pasarSeni,
    name: "Pasar Seni",
    // Real interchange: Kajang Line <-> Kelana Jaya Line.
    lines: [LINE_IDS.kajang, LINE_IDS.kelanaJaya],
    codes: ["KJ14", "KG16"],
    lat: 3.142439,
    lon: 101.69531,
    isOKU: true,
  },
  {
    id: STATION_IDS.merdeka,
    name: "Merdeka",
    lines: [LINE_IDS.kajang],
    codes: ["KG17"],
    lat: 3.141969,
    lon: 101.70205,
    isOKU: true,
  },
  {
    id: STATION_IDS.bukitBintang,
    name: "Bukit Bintang",
    lines: [LINE_IDS.kajang],
    codes: ["KG18A"],
    lat: 3.146503,
    lon: 101.710947,
    isOKU: true,
  },
  {
    id: STATION_IDS.masjidJamek,
    name: "Masjid Jamek",
    // Real interchange: Ampang / Sri Petaling Line <-> Kelana Jaya Line.
    lines: [LINE_IDS.ampangSriPetaling, LINE_IDS.kelanaJaya],
    codes: ["KJ13", "AG7", "SP7"],
    lat: 3.149714,
    lon: 101.696815,
    isOKU: true,
  },
  {
    id: STATION_IDS.klcc,
    name: "KLCC",
    lines: [LINE_IDS.kelanaJaya],
    codes: ["KJ10"],
    lat: 3.158935,
    lon: 101.713287,
    isOKU: true,
  },
];

// ── Lines (ordered stationIds) ──────────────────────────────────────────────
//
// PUTRAJAYA LINE STATION ORDER (city-bound, matches official PY codes):
//
//   Putrajaya Sentral → Chan Sow Lin → TRX → Conlay → Persiaran KLCC → Ampang Park
//
// The baseline journey travels Putrajaya Sentral → Ampang Park and MUST pass
// through TRX–Conlay (so the Disruption_Monitor marks it affected). Both
// recovery branch stations (Chan Sow Lin, TRX) sit BEFORE Conlay, so both
// alternatives genuinely avoid the blocked hop.
const lines: NetworkLine[] = [
  {
    id: LINE_IDS.putrajaya,
    name: "Putrajaya Line",
    mode: "MRT",
    kind: "rail",
    stationIds: [
      STATION_IDS.putrajayaSentral,
      STATION_IDS.chanSowLin,
      STATION_IDS.trx,
      STATION_IDS.conlay,
      STATION_IDS.persiaranKlcc,
      STATION_IDS.ampangPark,
    ],
  },
  {
    id: LINE_IDS.kelanaJaya,
    name: "Kelana Jaya Line",
    mode: "LRT",
    kind: "rail",
    // Ordered so each recovery interchange station connects to KLCC on this line.
    stationIds: [
      STATION_IDS.masjidJamek,
      STATION_IDS.pasarSeni,
      STATION_IDS.ampangPark,
      STATION_IDS.klcc,
    ],
  },
  {
    id: LINE_IDS.kajang,
    name: "Kajang Line",
    mode: "MRT",
    kind: "rail",
    stationIds: [
      STATION_IDS.trx,
      STATION_IDS.bukitBintang,
      STATION_IDS.merdeka,
      STATION_IDS.pasarSeni,
    ],
  },
  {
    id: LINE_IDS.ampangSriPetaling,
    name: "Ampang / Sri Petaling Line",
    mode: "LRT",
    kind: "rail",
    stationIds: [STATION_IDS.chanSowLin, STATION_IDS.masjidJamek],
  },
];

// ── Segments ────────────────────────────────────────────────────────────────
//
// `travelTimeMin` values are **demo fixture estimates** tuned with the
// interchange costs so the routes hit these totals (unchanged by Full Vision):
//
//   Baseline (PS → Ampang Park on Putrajaya, change, Kelana Jaya → KLCC):
//     9 + 4 + 3 + 2 + 2 + [3] + 5 = 28 min, 1 transfer, 180 m.
//   Alt A (TRX → Kajang → Pasar Seni → Kelana Jaya):
//     9 + 4 + [4] + 2 + 2 + 2 + [3] + 8 = 34 min, 2 transfers, 520 m.
//   Alt B (Chan Sow Lin → Ampang/Sri Petaling → Masjid Jamek → Kelana Jaya):
//     9 + [5] + 13 + [4] + 10 = 41 min, 2 transfers, 260 m.
//
// `fareSen` values are **demo fare estimates**: baseline RM4.20, Alt A RM4.40,
// Alt B RM4.20, Putrajaya Line to Persiaran KLCC RM3.80.
const segments: NetworkSegment[] = [
  // Putrajaya Line (city-bound order).
  {
    from: STATION_IDS.putrajayaSentral,
    to: STATION_IDS.chanSowLin,
    lineId: LINE_IDS.putrajaya,
    mode: "MRT",
    travelTimeMin: 9, // demo fixture estimate
    walkMeters: 0,
    fareSen: 300, // demo fare estimate
  },
  {
    from: STATION_IDS.chanSowLin,
    to: STATION_IDS.trx,
    lineId: LINE_IDS.putrajaya,
    mode: "MRT",
    travelTimeMin: 4, // demo fixture estimate
    walkMeters: 0,
    fareSen: 40,
  },
  {
    // THE BLOCKED SEGMENT in the demo disruption (TRX → Conlay, Putrajaya Line).
    from: STATION_IDS.trx,
    to: STATION_IDS.conlay,
    lineId: LINE_IDS.putrajaya,
    mode: "MRT",
    travelTimeMin: 3, // demo fixture estimate
    walkMeters: 0,
    fareSen: 20,
  },
  {
    // Full Vision split of the former Conlay → Ampang Park (4 min) hop.
    from: STATION_IDS.conlay,
    to: STATION_IDS.persiaranKlcc,
    lineId: LINE_IDS.putrajaya,
    mode: "MRT",
    travelTimeMin: 2, // demo fixture estimate
    walkMeters: 0,
    fareSen: 20,
  },
  {
    from: STATION_IDS.persiaranKlcc,
    to: STATION_IDS.ampangPark,
    lineId: LINE_IDS.putrajaya,
    mode: "MRT",
    travelTimeMin: 2, // demo fixture estimate
    walkMeters: 0,
    fareSen: 10,
  },

  // Kelana Jaya Line hops used by baseline + both alternatives to reach KLCC.
  {
    from: STATION_IDS.ampangPark,
    to: STATION_IDS.klcc,
    lineId: LINE_IDS.kelanaJaya,
    mode: "LRT",
    travelTimeMin: 5, // demo fixture estimate
    walkMeters: 0,
    fareSen: 30,
  },
  {
    from: STATION_IDS.pasarSeni,
    to: STATION_IDS.klcc,
    lineId: LINE_IDS.kelanaJaya,
    mode: "LRT",
    travelTimeMin: 8, // demo fixture estimate (Alt A leg)
    walkMeters: 0,
    fareSen: 40,
  },
  {
    from: STATION_IDS.masjidJamek,
    to: STATION_IDS.klcc,
    lineId: LINE_IDS.kelanaJaya,
    mode: "LRT",
    travelTimeMin: 10, // demo fixture estimate (Alt B leg)
    walkMeters: 0,
    fareSen: 60,
  },

  // Kajang Line hops (Alt A): TRX → Bukit Bintang → Merdeka → Pasar Seni.
  // Full Vision split of the former TRX → Pasar Seni (6 min) hop.
  {
    from: STATION_IDS.trx,
    to: STATION_IDS.bukitBintang,
    lineId: LINE_IDS.kajang,
    mode: "MRT",
    travelTimeMin: 2, // demo fixture estimate
    walkMeters: 0,
    fareSen: 20,
  },
  {
    from: STATION_IDS.bukitBintang,
    to: STATION_IDS.merdeka,
    lineId: LINE_IDS.kajang,
    mode: "MRT",
    travelTimeMin: 2, // demo fixture estimate
    walkMeters: 0,
    fareSen: 20,
  },
  {
    from: STATION_IDS.merdeka,
    to: STATION_IDS.pasarSeni,
    lineId: LINE_IDS.kajang,
    mode: "MRT",
    travelTimeMin: 2, // demo fixture estimate
    walkMeters: 0,
    fareSen: 20,
  },

  // Ampang / Sri Petaling Line hop (Alt B): Chan Sow Lin → Masjid Jamek.
  {
    from: STATION_IDS.chanSowLin,
    to: STATION_IDS.masjidJamek,
    lineId: LINE_IDS.ampangSriPetaling,
    mode: "LRT",
    travelTimeMin: 13, // demo fixture estimate (Alt B leg)
    walkMeters: 0,
    fareSen: 60,
  },
];

// ── Interchanges ────────────────────────────────────────────────────────────
// `transferTimeMin` and `walkMeters` are **demo fixture estimates**, tuned so
// Alt A ends up with ~520 m walk (fast but more walking) and Alt B with ~260 m
// walk (slower but less walking).
const interchanges: NetworkInterchange[] = [
  // Baseline interchange: Putrajaya Line -> Kelana Jaya Line at Ampang Park.
  {
    stationId: STATION_IDS.ampangPark,
    fromLineId: LINE_IDS.putrajaya,
    toLineId: LINE_IDS.kelanaJaya,
    walkMeters: 180, // demo fixture estimate
    transferTimeMin: 3, // demo fixture estimate
  },

  // Alt A interchanges.
  {
    // TRX: Putrajaya Line -> Kajang Line.
    stationId: STATION_IDS.trx,
    fromLineId: LINE_IDS.putrajaya,
    toLineId: LINE_IDS.kajang,
    walkMeters: 250, // demo fixture estimate (A: longer walk)
    transferTimeMin: 4, // demo fixture estimate
  },
  {
    // Pasar Seni: Kajang Line -> Kelana Jaya Line.
    stationId: STATION_IDS.pasarSeni,
    fromLineId: LINE_IDS.kajang,
    toLineId: LINE_IDS.kelanaJaya,
    walkMeters: 270, // demo fixture estimate (A: longer walk)
    transferTimeMin: 3, // demo fixture estimate
  },

  // Alt B interchanges.
  {
    // Chan Sow Lin: Putrajaya Line -> Ampang / Sri Petaling Line.
    stationId: STATION_IDS.chanSowLin,
    fromLineId: LINE_IDS.putrajaya,
    toLineId: LINE_IDS.ampangSriPetaling,
    walkMeters: 120, // demo fixture estimate (B: shorter walk)
    transferTimeMin: 5, // demo fixture estimate
  },
  {
    // Masjid Jamek: Ampang / Sri Petaling Line -> Kelana Jaya Line.
    stationId: STATION_IDS.masjidJamek,
    fromLineId: LINE_IDS.ampangSriPetaling,
    toLineId: LINE_IDS.kelanaJaya,
    walkMeters: 140, // demo fixture estimate (B: shorter walk)
    transferTimeMin: 4, // demo fixture estimate
  },
];

/**
 * The corrected, framework-free transport network fixture (CORE rail network).
 *
 * Network/schedule-derived — the domain layer labels legs built from this as
 * `sourceStatus = "SCHEDULED"`, `isSimulated = false`.
 */
export const demoNetwork: TransportNetwork = {
  stations,
  lines,
  segments,
  interchanges,
};

/** Convenience export of the fixture stations. */
export const demoStations: Station[] = stations;

/**
 * The simulated TRX–Conlay Putrajaya Line disruption.
 *
 * Labelling: `isSimulated = true`, `sourceStatus = "UNVERIFIED"` (a simulated
 * record is never `OPERATOR_CONFIRMED`), severity `"Severe disruption"`.
 */
export const demoDisruption: Disruption = {
  id: "demo-disruption-trx-conlay",
  affectedSegment: {
    from: STATION_IDS.trx,
    to: STATION_IDS.conlay,
    line: LINE_IDS.putrajaya,
  },
  severity: "Severe disruption",
  sourceStatus: "UNVERIFIED",
  isSimulated: true,
};

// ── Seeded Station Pulse reports ───────────────────────────────────────────
//
// DELIBERATE LABEL-AXIS CHOICE: seeded Pulse reports carry
// `sourceStatus = "COMMUNITY_REPORTED"` AND `isSimulated = true` — they are demo
// data, not reports from real passengers, and the UI says so. Live user
// submissions (MockDataProvider.submitReport) start `UNVERIFIED` / not
// simulated.
//
// Seeds are stored as minutes-ago OFFSETS and materialised relative to `now`
// on every read (see `buildSeededReports(now)`), so they stay inside the
// 30-min Pulse window however long the demo runs.

interface SeedSpec {
  id: string;
  stationId: string;
  reportType: StationReportType;
  minutesAgo: number;
}

/** Map a structured report type to the CORE crowd/severity condition. */
export function conditionForReportType(type: StationReportType): StationCondition {
  switch (type) {
    case "Busy":
      return "Busy";
    case "Packed":
    case "Cannot board":
      return "Packed";
    case "Train stopped":
      return "Severe disruption";
    default:
      // Normal + signal-only types. Signal-only reports are excluded from crowd
      // aggregation by the station-pulse domain, so this value is inert for them.
      return "Normal";
  }
}

const ALWAYS_SEEDS: SeedSpec[] = [
  // TRX — 12 recent reports: Busy earlier, Packed / Cannot board recently
  // (→ Packed, High confidence, rising trend).
  { id: "seed-trx-1", stationId: STATION_IDS.trx, reportType: "Packed", minutesAgo: 2 },
  { id: "seed-trx-2", stationId: STATION_IDS.trx, reportType: "Packed", minutesAgo: 3 },
  { id: "seed-trx-3", stationId: STATION_IDS.trx, reportType: "Cannot board", minutesAgo: 4 },
  { id: "seed-trx-4", stationId: STATION_IDS.trx, reportType: "Packed", minutesAgo: 5 },
  { id: "seed-trx-5", stationId: STATION_IDS.trx, reportType: "Packed", minutesAgo: 6 },
  { id: "seed-trx-6", stationId: STATION_IDS.trx, reportType: "Packed", minutesAgo: 8 },
  { id: "seed-trx-7", stationId: STATION_IDS.trx, reportType: "Packed", minutesAgo: 9 },
  { id: "seed-trx-8", stationId: STATION_IDS.trx, reportType: "Packed", minutesAgo: 12 },
  { id: "seed-trx-9", stationId: STATION_IDS.trx, reportType: "Busy", minutesAgo: 14 },
  { id: "seed-trx-10", stationId: STATION_IDS.trx, reportType: "Busy", minutesAgo: 18 },
  { id: "seed-trx-11", stationId: STATION_IDS.trx, reportType: "Busy", minutesAgo: 22 },
  { id: "seed-trx-12", stationId: STATION_IDS.trx, reportType: "Busy", minutesAgo: 26 },
  // Chan Sow Lin = Busy.
  { id: "seed-chan-sow-lin-1", stationId: STATION_IDS.chanSowLin, reportType: "Busy", minutesAgo: 6 },
  { id: "seed-chan-sow-lin-2", stationId: STATION_IDS.chanSowLin, reportType: "Busy", minutesAgo: 15 },
  // Pasar Seni = Busy — helps explain Alt A.
  { id: "seed-pasar-seni-1", stationId: STATION_IDS.pasarSeni, reportType: "Busy", minutesAgo: 9 },
  { id: "seed-pasar-seni-2", stationId: STATION_IDS.pasarSeni, reportType: "Normal", minutesAgo: 21 },
  // KLCC / Ampang Park = Normal (light context).
  { id: "seed-klcc-1", stationId: STATION_IDS.klcc, reportType: "Normal", minutesAgo: 11 },
  { id: "seed-ampang-park-1", stationId: STATION_IDS.ampangPark, reportType: "Normal", minutesAgo: 17 },
];

/** Scenario-only seeds, merged by consumers ONLY while the Demo_Scenario is active. */
const SCENARIO_SEEDS: SeedSpec[] = [
  { id: "scenario-conlay-1", stationId: STATION_IDS.conlay, reportType: "Train stopped", minutesAgo: 3 },
  { id: "scenario-conlay-2", stationId: STATION_IDS.conlay, reportType: "Train stopped", minutesAgo: 7 },
  { id: "scenario-trx-bus-1", stationId: STATION_IDS.trx, reportType: "Replacement bus available", minutesAgo: 4 },
  { id: "scenario-trx-board-1", stationId: STATION_IDS.trx, reportType: "Cannot board", minutesAgo: 1 },
];

function materialise(spec: SeedSpec, nowMs: number): CommunityReport {
  return {
    id: spec.id,
    stationId: spec.stationId,
    condition: conditionForReportType(spec.reportType),
    reportType: spec.reportType,
    timestamp: new Date(nowMs - spec.minutesAgo * 60_000).toISOString(),
    sourceStatus: "COMMUNITY_REPORTED",
    isSimulated: true,
  };
}

/**
 * Seeded Station Pulse community reports, timestamped relative to `now`.
 * Exported for tests and for the MockDataProvider.
 */
export function buildSeededReports(now: number = Date.now()): CommunityReport[] {
  return ALWAYS_SEEDS.map((s) => materialise(s, now));
}

/** Scenario-only seeded reports (simulated), timestamped relative to `now`. */
export function buildScenarioReports(now: number = Date.now()): CommunityReport[] {
  return SCENARIO_SEEDS.map((s) => materialise(s, now));
}
