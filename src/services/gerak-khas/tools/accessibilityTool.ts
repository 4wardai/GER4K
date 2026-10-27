/**
 * AccessibilityTool — honest-uncertainty-first (Requirement 24). There is NO
 * per-station accessibility dataset in GER4K, so this tool surfaces the
 * Accessible ranking preference and the GTFS `isOKU` flag where present, and
 * ALWAYS states that verified live lift/escalator/facility status is not
 * available. It never fabricates facilities.
 */
import { profileForMobilityNeeds } from "@/domain/personal";
import type { AskStationContext } from "@/services/ai";
import type { MobilityNeed, PreferenceProfile } from "@/types";
import type { MobilityToolResult } from "../types";
import { assessAccessibility } from "../accessibility/uncertaintyModel";
import { evidence } from "./helpers";

export interface AccessibilityToolData {
  preference: PreferenceProfile;
  okuFlag: boolean | null;
  uncertainty: string;
}

export function accessibilityTool(
  stationId: string | null,
  mobilityNeeds: MobilityNeed[],
  stations: AskStationContext[],
): MobilityToolResult<AccessibilityToolData> {
  const preference = profileForMobilityNeeds(mobilityNeeds, "Accessible");
  const s = stationId ? stations.find((x) => x.stationId === stationId) : undefined;
  const assessment = assessAccessibility(s?.isOKU);
  const ev = [
    evidence("accessibility", "Suggested priority", preference, "UNVERIFIED", false),
    evidence("accessibility", "Verified facilities", assessment.uncertainty, "UNVERIFIED", false, stationId ? { stationId } : undefined),
  ];
  return {
    ok: true,
    data: { preference, okuFlag: s?.isOKU ?? null, uncertainty: assessment.uncertainty },
    evidence: ev,
  };
}
