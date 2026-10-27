/**
 * Personal features — saved-journey alerts and mobility needs (Requirements
 * 29, 30). Pure and deterministic; storage lives in the UI layer.
 */

import type {
  Disruption,
  MobilityNeed,
  PreferenceProfile,
  SavedJourney,
  SavedJourneyAlert,
  TransportNetwork,
} from "@/types";
import { isNoRouteFound, planJourneyOnNetwork } from "@/domain/transport";
import { evaluateImpact } from "@/domain/disruption";

/**
 * Evaluate every saved journey's usual route (CORE planner on the CORE rail
 * network) against the active disruptions with the CORE Disruption_Monitor.
 * Returns one alert per affected saved journey.
 */
export function evaluateSavedJourneyAlerts(
  saved: ReadonlyArray<SavedJourney>,
  network: TransportNetwork,
  activeDisruptions: ReadonlyArray<Disruption>,
): SavedJourneyAlert[] {
  if (activeDisruptions.length === 0) return [];
  const alerts: SavedJourneyAlert[] = [];
  for (const s of saved) {
    const plan = planJourneyOnNetwork(network, s.originId, s.destinationId);
    if (isNoRouteFound(plan)) continue;
    for (const d of activeDisruptions) {
      const impact = evaluateImpact(plan.journey, [d], network);
      if (!impact.affected) continue;
      const lineRef = d.affectedSegment.line;
      const line =
        network.lines.find((l) => l.id === lineRef) ??
        network.lines.find((l) => l.name === lineRef);
      alerts.push({
        savedJourneyId: s.id,
        label: s.label,
        originId: s.originId,
        destinationId: s.destinationId,
        disruptionId: d.id,
        affectedFrom: d.affectedSegment.from,
        affectedTo: d.affectedSegment.to,
        lineName: line?.name ?? lineRef ?? "Rail",
        isSimulated: d.isSimulated,
      });
      break;
    }
  }
  return alerts;
}

/** Mobility needs, in display order, with passenger labels. */
export const MOBILITY_NEEDS: ReadonlyArray<{ need: MobilityNeed; label: string }> = [
  { need: "less-walking", label: "Less walking" },
  { need: "fewer-transfers", label: "Fewer transfers" },
  { need: "avoid-stairs", label: "Avoid stairs" },
  { need: "wheelchair", label: "Wheelchair-friendly" },
  { need: "elderly", label: "Travelling with an elderly passenger" },
];

/**
 * Map selected mobility needs to a default ranking profile (Requirement 30.2):
 * wheelchair / avoid-stairs / elderly → Accessible; else less-walking → Least
 * Walking; else fewer-transfers → Fewest Transfers; else the fallback.
 */
export function profileForMobilityNeeds(
  needs: ReadonlyArray<MobilityNeed>,
  fallback: PreferenceProfile,
): PreferenceProfile {
  const has = (n: MobilityNeed) => needs.includes(n);
  if (has("wheelchair") || has("avoid-stairs") || has("elderly")) return "Accessible";
  if (has("less-walking")) return "Least Walking";
  if (has("fewer-transfers")) return "Fewest Transfers";
  return fallback;
}
