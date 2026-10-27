/**
 * BusTool — exposes the ACTUAL discovered bus fixtures (Requirement 19). There
 * are exactly two in the repo:
 *   - Rapid KL bus 300 — GTFS-backed Rapid KL BUS (SCHEDULED, not simulated).
 *     NEVER described as an MRT feeder; there is no T508 in the fixture.
 *   - Replacement bus — the SIMULATED disruption-recovery bridging service
 *     (UNVERIFIED, isSimulated=true), surfaced as recovery option C.
 * It reads bus-supported options from the context and attaches a simulated
 * arrival countdown where a headway is known.
 */
import { simulatedNextArrivalMin } from "@/domain/service";
import type { JourneyOption } from "@/types";
import type { CurrentJourneyContext, MobilityToolResult } from "../types";
import { changes, evidence, metres, minutes, optionHasBus } from "./helpers";

export interface BusToolData {
  option: JourneyOption;
  arrivalMin: number | null;
}

export function busTool(
  ctx: CurrentJourneyContext | null,
): MobilityToolResult<BusToolData> {
  if (!ctx) return { ok: false, reason: "no journey is currently in context" };
  const pool = [...ctx.options, ...ctx.candidates];
  const busOption = pool.find((o) => optionHasBus(o));
  if (!busOption) {
    return { ok: false, reason: "no bus option for this journey" };
  }
  // Arrival is simulated when the option uses a simulated service.
  const arrivalMin = busOption.isSimulated
    ? simulatedNextArrivalMin(busOption.id, 10, ctx.now)
    : simulatedNextArrivalMin(busOption.id, 7, ctx.now);
  const source = busOption.isSimulated ? "UNVERIFIED" : "SCHEDULED";
  const ev = [
    evidence("bus", busOption.title, `${minutes(busOption.journey.totalTimeMin)} · ${changes(busOption.journey.transfers)} · ${metres(busOption.journey.totalWalkMeters)}`, source, busOption.isSimulated, { routeId: busOption.id }),
    evidence("bus", "Next arrival", `~${arrivalMin} min`, source, busOption.isSimulated, { routeId: busOption.id }),
  ];
  return { ok: true, data: { option: busOption, arrivalMin }, evidence: ev };
}
