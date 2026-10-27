"use client";

import { useMemo } from "react";

import { demoStations, historicalDemandDataset, mockDataProvider } from "@/data";
import { isNoRouteFound, planJourneyOnNetwork } from "@/domain/transport";
import { evaluateImpact } from "@/domain/disruption";
import { buildJourneyOptions } from "@/domain/options";
import { buildStationContexts } from "@/services/ai/buildCopilotRequest";
import type { AskStationContext } from "@/services/ai";
import type {
  Disruption,
  Journey,
  JourneyImpact,
  JourneyOptionsResult,
  PreferenceProfile,
  StationPulseDetail,
} from "@/types";
import { useDemoScenario } from "@/components/demo";
import { stationName, useActiveDisruptions, useStationPulse } from "@/components/state/useLiveData";

export interface JourneyPlan {
  /** The usual (CORE planner) route for this O/D, or null when none exists. */
  usual: Journey | null;
  /** CORE Disruption_Monitor result for the usual route. */
  impact: JourneyImpact | null;
  recovery: boolean;
  disruptions: Disruption[];
  /** Disruptions that affect the usual route (for the banner). */
  affecting: Disruption[];
  result: JourneyOptionsResult;
  pulse: Map<string, StationPulseDetail>;
  stations: AskStationContext[];
  now: number;
  ready: boolean;
}

/**
 * Plan a journey end to end on the client: CORE planner for the usual route,
 * CORE Disruption_Monitor for impact, Journey_Options_Engine for the options.
 * Pure domain calls, in memory, no network.
 */
export function useJourneyPlan(
  originId: string,
  destinationId: string,
  profile: PreferenceProfile,
): JourneyPlan {
  const { active } = useDemoScenario();
  const disruptions = useActiveDisruptions();
  const { pulse, now, ready } = useStationPulse();

  return useMemo(() => {
    const core = mockDataProvider.getNetwork();
    const usualPlan = planJourneyOnNetwork(core, originId, destinationId);
    const usual = isNoRouteFound(usualPlan) ? null : usualPlan.journey;
    const impact = usual ? evaluateImpact(usual, disruptions, core) : null;
    const affecting = usual
      ? disruptions.filter((d) => evaluateImpact(usual, [d], core).affected)
      : [];
    const recovery = !!impact?.affected;

    const result = buildJourneyOptions({
      network: mockDataProvider.getMultimodalNetwork({ includeScenarioServices: active }),
      coreNetwork: core,
      originId,
      destinationId,
      disruptions,
      isRecovery: recovery,
      pulseByStation: pulse,
      fareRules: mockDataProvider.getFareRules(),
      profile,
      stationName,
    });

    const stations = buildStationContexts(
      demoStations.map((s) => s.id),
      demoStations,
      pulse,
      historicalDemandDataset,
      now,
    );

    return { usual, impact, recovery, disruptions, affecting, result, pulse, stations, now, ready };
  }, [originId, destinationId, profile, active, disruptions, pulse, now, ready]);
}
