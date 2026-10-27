/**
 * PulseTool — reads the EXISTING Station Pulse aggregation (30-min window,
 * <=10-min double recency weight) via the station contexts the journey screen
 * already built from `aggregatePulseForStation`. It never re-aggregates.
 */
import type { AskStationContext } from "@/services/ai";
import type { MobilityToolResult } from "../types";
import { evidence } from "./helpers";

export interface PulseToolData {
  stationId: string;
  name: string;
  condition: string;
  reportCount: number;
  band: string;
}

export function pulseTool(
  stationId: string | null,
  stations: AskStationContext[],
): MobilityToolResult<PulseToolData> {
  if (!stationId) return { ok: false, reason: "no station in question" };
  const s = stations.find((x) => x.stationId === stationId);
  if (!s) return { ok: false, reason: "station not recognised" };
  if (s.reportCount === 0) {
    return { ok: false, reason: "no recent reports for that station" };
  }
  return {
    ok: true,
    data: { stationId, name: s.name, condition: s.condition, reportCount: s.reportCount, band: s.band },
    evidence: [
      evidence("pulse", s.name, `${s.condition} · ${s.reportCount} recent report${s.reportCount === 1 ? "" : "s"}`, "COMMUNITY_REPORTED", s.isSimulated, { stationId }),
    ],
  };
}
