/**
 * Shared helpers for the Gerak Khas mobility tools. Pure, framework-free.
 *
 * Every tool turns EXISTING GER4K domain output into JSON-serializable
 * evidence. No tool re-implements planning, ranking, fares, confidence or pulse
 * aggregation — they read the domain's results and attach the two independent
 * label axes (`sourceStatus`, `isSimulated`) to each `EvidenceItem`.
 */

import type { JourneyOption } from "@/types";
import type { EvidenceItem, MobilityToolName } from "../types";

export function rm(sen: number): string {
  return `RM${(sen / 100).toFixed(2)}`;
}

export function metres(m: number): string {
  return `${Math.round(m)} m`;
}

export function minutes(min: number): string {
  return `${Math.round(min)} min`;
}

export function changes(n: number): string {
  return n === 0 ? "no changes" : `${n} change${n === 1 ? "" : "s"}`;
}

export function evidence(
  tool: MobilityToolName,
  label: string,
  value: string,
  sourceStatus: EvidenceItem["sourceStatus"],
  isSimulated: boolean,
  extra?: { stationId?: string; routeId?: string },
): EvidenceItem {
  return { tool, label, value, sourceStatus, isSimulated, ...extra };
}

/** Does an option touch (board/transfer/alight or pass through) a station? */
export function optionTouches(option: JourneyOption, stationId: string): boolean {
  return (
    option.touchStationIds.includes(stationId) || option.pathStationIds.includes(stationId)
  );
}

/** True when an option uses a bus or replacement bus. */
export function optionHasBus(option: JourneyOption): boolean {
  return option.hasBus;
}
