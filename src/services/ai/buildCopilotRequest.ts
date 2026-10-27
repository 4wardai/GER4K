/**
 * buildCopilotRequest — pure helper that flattens DOMAIN results (journey
 * options, station pulse, historical demand) into the `/api/ask` request
 * (Requirement 31). It reads domain output only: no ranking, no routing, no
 * confidence computation. Safe for client and server.
 */

import type {
  AiExplanationOption,
  AiExplanationRequest,
  AskStationContext,
} from "./AiProvider";
import type {
  HistoricalDemandDataset,
  JourneyOption,
  JourneyOptionsResult,
  Station,
  StationPulseDetail,
} from "@/types";
import { historicalDemandFor } from "@/domain/demand";

export function optionToAsk(option: JourneyOption, rank: number): AiExplanationOption {
  return {
    id: option.id,
    label: option.title,
    title: option.title,
    rank,
    travelTimeMin: option.journey.totalTimeMin,
    transfers: option.journey.transfers,
    totalWalkMeters: option.journey.totalWalkMeters,
    confidenceScore: option.confidence.score,
    confidenceBand: option.confidence.band,
    confidenceFactors: option.confidence.factors,
    fareSen: option.fare.totalSen,
    crowdLevel: option.journey.crowdLevel ?? 0,
    accessIssues: option.journey.accessIssues ?? 0,
    touchStationIds: option.touchStationIds,
    pathStationIds: option.pathStationIds,
    hasBus: option.hasBus,
    isSimulated: option.isSimulated,
    strategies: option.strategies,
  };
}

/** Station contexts for every station in `stationIds`. */
export function buildStationContexts(
  stationIds: ReadonlyArray<string>,
  stations: ReadonlyArray<Station>,
  pulseByStation: ReadonlyMap<string, StationPulseDetail>,
  demand: HistoricalDemandDataset,
  now: number,
): AskStationContext[] {
  const out: AskStationContext[] = [];
  for (const id of new Set(stationIds)) {
    const station = stations.find((s) => s.id === id);
    const detail = pulseByStation.get(id);
    if (!station || !detail) continue;
    const { summary } = detail;
    const freshnessMin =
      summary.mostRecentAt === null
        ? null
        : Math.max(0, Math.round((now - new Date(summary.mostRecentAt).getTime()) / 60_000));
    const hd = historicalDemandFor(demand, id);
    out.push({
      stationId: id,
      name: station.name,
      condition: summary.condition,
      reportCount: summary.reportCount,
      freshnessMin,
      band: summary.confidence.band,
      trend: detail.trend,
      signals: detail.signals.map((s) => s.type),
      ...(hd ? { demandBand: hd.band } : {}),
      ...(station.isOKU !== undefined ? { isOKU: station.isOKU } : {}),
      isSimulated: summary.isSimulated || detail.signals.some((s) => s.isSimulated),
    });
  }
  return out;
}

export interface BuildCopilotRequestInput {
  result: JourneyOptionsResult;
  question?: string;
  focusedOptionId?: string | null;
  stations: AskStationContext[];
  disruptionSummary?: string;
  destinationName?: string;
}

/** Build the co-pilot request, or null when there is nothing to explain. */
export function buildCopilotRequest(input: BuildCopilotRequestInput): AiExplanationRequest | null {
  const { result } = input;
  if (result.options.length === 0) return null;
  const alternatives = result.options.map((o, i) => optionToAsk(o, i + 1));
  const presentedIds = new Set(alternatives.map((o) => o.id));
  const candidates = result.candidates
    .filter((c) => !presentedIds.has(c.id))
    .map((c, i) => optionToAsk(c, alternatives.length + i + 1));
  const focused =
    (input.focusedOptionId && alternatives.find((o) => o.id === input.focusedOptionId)) ||
    alternatives[0];

  return {
    question: input.question,
    profile: result.profile,
    recommended: alternatives[0],
    alternatives,
    confidenceFactors: focused.confidenceFactors ?? [],
    ...(input.disruptionSummary ? { disruptionSummary: input.disruptionSummary } : {}),
    mode: result.mode,
    ...(input.destinationName ? { destinationName: input.destinationName } : {}),
    ...(input.focusedOptionId ? { focusedOptionId: input.focusedOptionId } : {}),
    candidates,
    stations: input.stations,
  };
}
