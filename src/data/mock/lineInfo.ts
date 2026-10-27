/**
 * Line metadata (Full Vision, Requirements 17 and 26).
 *
 * Names, codes, descriptions and colours come from the official GTFS Static
 * `rapid-rail-kl` / `rapid-bus-kl` routes.txt (route_long_name, route_desc,
 * route_color), inspected at development time. `realOrder` lists fixture
 * stations in official code order so direction text ("towards Kwasa Damansara")
 * is correct for any leg.
 *
 * The replacement bus is a simulated scenario service.
 */

import type { LineInfo } from "@/types";
import { LINE_IDS, STATION_IDS } from "./fixture";
import { MULTIMODAL_LINE_IDS } from "./multimodal";

export const RAPID_KL_OPERATOR = "Rapid KL (Prasarana Malaysia)";

export const lineInfo: LineInfo[] = [
  {
    lineId: LINE_IDS.putrajaya,
    name: "Putrajaya Line",
    code: "PYL",
    mode: "MRT",
    colour: "#FFCD00",
    textColour: "#1F2937",
    operator: RAPID_KL_OPERATOR,
    description: "Putrajaya ~ Kwasa Damansara",
    kind: "rail",
    // PY20 → PY41 (PY01 = Kwasa Damansara end).
    realOrder: [
      STATION_IDS.ampangPark,
      STATION_IDS.persiaranKlcc,
      STATION_IDS.conlay,
      STATION_IDS.trx,
      STATION_IDS.chanSowLin,
      STATION_IDS.putrajayaSentral,
    ],
    termini: ["Kwasa Damansara", "Putrajaya Sentral"],
  },
  {
    lineId: LINE_IDS.kajang,
    name: "Kajang Line",
    code: "KGL",
    mode: "MRT",
    colour: "#047940",
    textColour: "#FFFFFF",
    operator: RAPID_KL_OPERATOR,
    description: "Kwasa Damansara ~ Kajang",
    kind: "rail",
    // KG16 → KG20.
    realOrder: [
      STATION_IDS.pasarSeni,
      STATION_IDS.merdeka,
      STATION_IDS.bukitBintang,
      STATION_IDS.trx,
    ],
    termini: ["Kwasa Damansara", "Kajang"],
  },
  {
    lineId: LINE_IDS.kelanaJaya,
    name: "Kelana Jaya Line",
    code: "KJL",
    mode: "LRT",
    colour: "#D50032",
    textColour: "#FFFFFF",
    operator: RAPID_KL_OPERATOR,
    description: "Gombak ~ Putra Heights",
    kind: "rail",
    // KJ9 → KJ14 (KJ1 = Gombak end).
    realOrder: [
      STATION_IDS.ampangPark,
      STATION_IDS.klcc,
      STATION_IDS.masjidJamek,
      STATION_IDS.pasarSeni,
    ],
    termini: ["Gombak", "Putra Heights"],
  },
  {
    lineId: LINE_IDS.ampangSriPetaling,
    name: "Ampang / Sri Petaling Line",
    code: "AGL",
    mode: "LRT",
    colour: "#E57200",
    textColour: "#FFFFFF",
    operator: RAPID_KL_OPERATOR,
    description: "Sentul Timur ~ Ampang / Putra Heights",
    kind: "rail",
    // AG7 → AG11 (AG01 = Sentul Timur end).
    realOrder: [STATION_IDS.masjidJamek, STATION_IDS.chanSowLin],
    termini: ["Sentul Timur", "Ampang / Putra Heights"],
  },
  {
    lineId: MULTIMODAL_LINE_IDS.bus300,
    name: "Rapid KL bus 300",
    code: "300",
    mode: "Rapid KL Bus",
    colour: "#1D4ED8",
    textColour: "#FFFFFF",
    operator: "Rapid KL",
    description: "Terminal Maluri ~ Lebuh Ampang",
    kind: "bus",
    realOrder: [STATION_IDS.masjidJamek, STATION_IDS.klcc],
    termini: ["Lebuh Ampang", "Ampang (via KLCC)"],
    headwayText: "Every 5–10 min on weekdays",
  },
  {
    lineId: MULTIMODAL_LINE_IDS.replacementBus,
    name: "Replacement bus",
    code: "BUS",
    mode: "Replacement Bus",
    colour: "#475569",
    textColour: "#FFFFFF",
    operator: "Rapid KL (simulated bridging service)",
    description: "TRX ~ Persiaran KLCC",
    kind: "replacement-bus",
    realOrder: [STATION_IDS.trx, STATION_IDS.conlay, STATION_IDS.persiaranKlcc],
    termini: ["TRX", "Persiaran KLCC"],
    headwayText: "About every 10 min",
    isSimulated: true,
  },
];

/** Official MRT feeder / bus services near fixture stations (GTFS names + headsigns). */
export interface NearbyService {
  id: string;
  code: string;
  kind: "feeder" | "bus";
  stationId: string;
  headsign: string;
  /** Typical headway used only to drive the SIMULATED arrival countdown. */
  simulatedHeadwayMin: number;
}

export const nearbyServices: NearbyService[] = [
  {
    id: "feeder-t509",
    code: "T509",
    kind: "feeder",
    stationId: STATION_IDS.putrajayaSentral,
    headsign: "MRT Putrajaya Sentral – Presint 16 / Alamanda",
    simulatedHeadwayMin: 15,
  },
  {
    id: "feeder-t511",
    code: "T511",
    kind: "feeder",
    stationId: STATION_IDS.putrajayaSentral,
    headsign: "MRT Putrajaya Sentral – Presint 4",
    simulatedHeadwayMin: 20,
  },
  {
    id: "feeder-t407",
    code: "T407",
    kind: "feeder",
    stationId: STATION_IDS.trx,
    headsign: "MRT Tun Razak Exchange – Taman Maluri / Desa Pandan",
    simulatedHeadwayMin: 15,
  },
  {
    id: "feeder-t418",
    code: "T418",
    kind: "feeder",
    stationId: STATION_IDS.chanSowLin,
    headsign: "MRT Chan Sow Lin – Kenanga Mall",
    simulatedHeadwayMin: 20,
  },
  {
    id: "bus-300",
    code: "300",
    kind: "bus",
    stationId: STATION_IDS.masjidJamek,
    headsign: "Terminal Maluri ~ Lebuh Ampang (via KLCC)",
    simulatedHeadwayMin: 7,
  },
];
