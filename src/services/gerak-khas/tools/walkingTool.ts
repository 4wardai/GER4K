/**
 * WalkingTool — reads walking distance from the EXISTING journey totals
 * (metres). It never invents exits, walkways, lifts, stairs or crossings.
 */
import type { JourneyOption } from "@/types";
import type { MobilityToolResult } from "../types";
import { evidence, metres } from "./helpers";

export interface WalkingToolData {
  totalWalkMeters: number;
  formatted: string;
}

export function walkingTool(option: JourneyOption | null): MobilityToolResult<WalkingToolData> {
  if (!option) return { ok: false, reason: "no walking info — no route selected" };
  const m = option.journey.totalWalkMeters;
  return {
    ok: true,
    data: { totalWalkMeters: m, formatted: metres(m) },
    evidence: [evidence("walking", "Walking", metres(m), "ESTIMATED", option.isSimulated, { routeId: option.id })],
  };
}
