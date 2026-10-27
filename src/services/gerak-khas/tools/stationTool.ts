/**
 * StationTool — structured station context (name, lines, Pulse, historical
 * demand, OKU flag where available). Unknown facts stay unknown.
 */
import type { AskStationContext } from "@/services/ai";
import { lineInfo } from "@/data";
import { demoNetwork } from "@/data";
import type { MobilityToolResult } from "../types";
import { evidence } from "./helpers";

export interface StationToolData {
  stationId: string;
  name: string;
  lines: string[];
  condition: string | null;
  demandBand: string | null;
  isOKU: boolean | null;
}

function linesForStation(stationId: string): string[] {
  return demoNetwork.lines
    .filter((l) => l.stationIds.includes(stationId))
    .map((l) => lineInfo.find((li) => li.lineId === l.id)?.name ?? l.name);
}

export function stationTool(
  stationId: string | null,
  stations: AskStationContext[],
): MobilityToolResult<StationToolData> {
  if (!stationId) return { ok: false, reason: "no station in question" };
  const s = stations.find((x) => x.stationId === stationId);
  if (!s) return { ok: false, reason: "station not recognised" };
  const lines = linesForStation(stationId);
  const ev = [
    evidence("station", s.name, lines.length ? lines.join(", ") : "on the network", "SCHEDULED", false, { stationId }),
  ];
  if (s.reportCount > 0) {
    ev.push(evidence("station", "Right now", s.condition, "COMMUNITY_REPORTED", s.isSimulated, { stationId }));
  }
  if (s.demandBand) {
    ev.push(evidence("station", "Typically", `${s.demandBand} demand`, "HISTORICAL", false, { stationId }));
  }
  return {
    ok: true,
    data: {
      stationId,
      name: s.name,
      lines,
      condition: s.reportCount > 0 ? s.condition : null,
      demandBand: s.demandBand ?? null,
      isOKU: s.isOKU ?? null,
    },
    evidence: ev,
  };
}
