"use client";

import { useEffect } from "react";

import { useGerakKhas } from "@/components/gerak-khas/GerakKhasProvider";
import { stationName } from "@/components/state/useLiveData";
import type { JourneyPlan } from "@/components/journey/useJourneyPlan";
import type { MobilityNeed } from "@/types";
import type { CurrentJourneyContext } from "../types";

/**
 * useJourneyContextBridge — the journey screen's single publisher of the
 * current journey context into the globally-mounted GerakKhasProvider
 * (Requirement 10). It does NOT create a second `useJourneyPlan` and does NOT
 * move the journey engine into global state: it projects the MINIMAL context
 * the co-pilot needs and clears it on unmount.
 */

function severityFor(plan: JourneyPlan): "none" | "moderate" | "severe" {
  if (!plan.recovery || plan.affecting.length === 0) return "none";
  const worst = plan.affecting.some((d) => d.severity === "Severe disruption");
  return worst ? "severe" : "moderate";
}

export function useJourneyContextBridge(
  originId: string,
  destinationId: string,
  plan: JourneyPlan,
  selectedRouteId: string | null,
  mobilityNeeds: MobilityNeed[] = [],
): void {
  const { publishJourneyContext, clearJourneyContext } = useGerakKhas();

  useEffect(() => {
    if (!plan.ready) return;
    const disruptionSummary = plan.affecting[0]
      ? `${stationName(plan.affecting[0].affectedSegment.from)} \u2192 ${stationName(plan.affecting[0].affectedSegment.to)}`
      : "";
    const pulse: CurrentJourneyContext["pulse"] = {};
    plan.pulse.forEach((detail, id) => {
      pulse[id] = detail;
    });

    const ctx: CurrentJourneyContext = {
      originId,
      destinationId,
      originName: stationName(originId),
      destinationName: stationName(destinationId),
      usualRouteId: plan.usual?.id ?? null,
      selectedRouteId,
      options: plan.result.options,
      candidates: plan.result.candidates,
      profile: plan.result.profile,
      mobilityNeeds,
      recovery: plan.recovery,
      disruption: plan.recovery
        ? { summary: disruptionSummary, severity: severityFor(plan) }
        : null,
      pulse,
      stations: plan.stations,
      now: plan.now,
    };
    publishJourneyContext(ctx);
  }, [originId, destinationId, plan, selectedRouteId, mobilityNeeds, publishJourneyContext]);

  // Clear journey-specific context when the journey screen unmounts.
  useEffect(() => {
    return () => clearJourneyContext();
  }, [clearJourneyContext]);
}

