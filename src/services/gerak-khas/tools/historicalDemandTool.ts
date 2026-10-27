/**
 * HistoricalDemandTool — reuses the EXISTING Historical Demand domain logic.
 * Always labelled HISTORICAL (never live crowding).
 */
import { historicalDemandFor, describeDemand } from "@/domain/demand";
import { historicalDemandDataset } from "@/data";
import type { MobilityToolResult } from "../types";
import { evidence } from "./helpers";

export interface HistoricalDemandToolData {
  stationId: string;
  band: string;
  description: string;
}

export function historicalDemandTool(
  stationId: string | null,
): MobilityToolResult<HistoricalDemandToolData> {
  if (!stationId) return { ok: false, reason: "no station in question" };
  const hd = historicalDemandFor(historicalDemandDataset, stationId);
  if (!hd) return { ok: false, reason: "no historical demand data for that station" };
  return {
    ok: true,
    data: { stationId, band: hd.band, description: describeDemand(hd) },
    evidence: [evidence("historicalDemand", "Typical demand", `${hd.band} (historical data)`, "HISTORICAL", false, { stationId })],
  };
}
