/**
 * JourneyTool — reads the EXISTING journey options for the current context.
 * It never re-plans; options come from `buildJourneyOptions` (via the context).
 */
import type { JourneyOption } from "@/types";
import type { CurrentJourneyContext, MobilityToolResult } from "../types";
import { changes, evidence, metres, minutes } from "./helpers";

export interface JourneyToolData {
  selected: JourneyOption | null;
  options: JourneyOption[];
}

export function journeyTool(
  ctx: CurrentJourneyContext | null,
): MobilityToolResult<JourneyToolData> {
  if (!ctx || ctx.options.length === 0) {
    return { ok: false, reason: "no route to that destination" };
  }
  const selected =
    ctx.options.find((o) => o.id === ctx.selectedRouteId) ?? ctx.options[0] ?? null;
  const ev = selected
    ? [
        evidence("journey", "Travel time", minutes(selected.journey.totalTimeMin), "SCHEDULED", selected.isSimulated, { routeId: selected.id }),
        evidence("journey", "Transfers", changes(selected.journey.transfers), "SCHEDULED", selected.isSimulated, { routeId: selected.id }),
        evidence("journey", "Walking", metres(selected.journey.totalWalkMeters), "ESTIMATED", selected.isSimulated, { routeId: selected.id }),
      ]
    : [];
  return { ok: true, data: { selected, options: ctx.options }, evidence: ev };
}
