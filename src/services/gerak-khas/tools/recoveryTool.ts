/**
 * RecoveryTool — surfaces recovery alternatives for the current context. It
 * reuses the EXISTING recovery pipeline (options are already recovery-mode when
 * the journey is affected); it never recomputes recovery itself.
 */
import type { JourneyOption } from "@/types";
import type { CurrentJourneyContext, MobilityToolResult } from "../types";
import { changes, evidence, metres, minutes, optionHasBus } from "./helpers";

export interface RecoveryToolData {
  recovery: boolean;
  alternatives: JourneyOption[];
}

export function recoveryTool(
  ctx: CurrentJourneyContext | null,
): MobilityToolResult<RecoveryToolData> {
  if (!ctx) return { ok: false, reason: "no journey is currently in context" };
  if (!ctx.recovery) {
    return { ok: true, data: { recovery: false, alternatives: ctx.options }, evidence: [] };
  }
  if (ctx.options.length === 0) {
    return { ok: false, reason: "no recovery alternative found" };
  }
  const ev = ctx.options.slice(0, 3).map((o) =>
    evidence(
      "recovery",
      o.title,
      `${minutes(o.journey.totalTimeMin)} · ${changes(o.journey.transfers)} · ${metres(o.journey.totalWalkMeters)}${optionHasBus(o) ? " · bus-supported" : ""}`,
      "SCHEDULED",
      o.isSimulated,
      { routeId: o.id },
    ),
  );
  return { ok: true, data: { recovery: true, alternatives: ctx.options }, evidence: ev };
}
