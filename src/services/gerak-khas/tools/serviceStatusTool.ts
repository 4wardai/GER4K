/**
 * ServiceStatusTool — reuses the EXISTING line-status derivation
 * (`deriveLineStatuses`). A disrupted line carries the disruption's own labels
 * (simulated demo disruption → isSimulated=true); a normal line is SCHEDULED.
 */
import { deriveLineStatuses } from "@/domain/service";
import { lineInfo, mockDataProvider } from "@/data";
import type { Disruption, LineStatus, PulseSummary, StationPulseDetail } from "@/types";
import type { MobilityToolResult } from "../types";
import { evidence } from "./helpers";

export interface ServiceStatusToolData {
  statuses: LineStatus[];
}

export function serviceStatusTool(
  disruptions: Disruption[],
  pulse: Record<string, StationPulseDetail>,
  stationName: (id: string) => string,
  lineId?: string,
): MobilityToolResult<ServiceStatusToolData> {
  const network = mockDataProvider.getNetwork();
  const pulseSummaries = new Map<string, PulseSummary>(
    Object.entries(pulse).map(([id, detail]) => [id, detail.summary]),
  );
  const all = deriveLineStatuses(lineInfo, network, disruptions, pulseSummaries, stationName);
  const statuses = lineId ? all.filter((s) => s.lineId === lineId) : all;
  if (statuses.length === 0) {
    return { ok: false, reason: "no service status for that line" };
  }
  const ev = statuses.map((s) =>
    evidence(
      "service",
      lineInfo.find((l) => l.lineId === s.lineId)?.name ?? s.lineId,
      s.status === "Disrupted" ? (s.notice ?? "Disrupted") : "Normal service",
      s.sourceStatus,
      s.isSimulated,
    ),
  );
  return { ok: true, data: { statuses }, evidence: ev };
}
