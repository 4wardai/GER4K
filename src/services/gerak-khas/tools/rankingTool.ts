/**
 * RankingTool — orders candidates using ONLY the existing Ranking_Engine
 * (`rankAlternatives`). Gerak Khas never sorts routes itself.
 */
import { rankAlternatives } from "@/domain/recovery";
import type { JourneyOption, PreferenceProfile } from "@/types";
import type { MobilityToolResult } from "../types";
import { evidence } from "./helpers";

export interface RankingToolData {
  ordered: JourneyOption[];
  profile: PreferenceProfile;
}

export function rankingTool(
  candidates: JourneyOption[],
  profile: PreferenceProfile,
): MobilityToolResult<RankingToolData> {
  if (candidates.length === 0) {
    return { ok: false, reason: "no routes to rank" };
  }
  // rankAlternatives orders Journey[]; map back to the owning options by id.
  const byId = new Map(candidates.map((o) => [o.journey.id, o]));
  const orderedJourneys = rankAlternatives(candidates.map((o) => o.journey), profile);
  const ordered = orderedJourneys
    .map((j) => byId.get(j.id))
    .filter((o): o is JourneyOption => !!o);
  const top = ordered[0];
  const ev = top
    ? [evidence("ranking", `Best for ${profile}`, top.title, "SCHEDULED", top.isSimulated, { routeId: top.id })]
    : [];
  return { ok: true, data: { ordered, profile }, evidence: ev };
}
