"use client";

import { useEffect, useMemo, useState } from "react";

import {
  demoStations,
  historicalDemandDataset,
  mockDataProvider,
} from "@/data";
import { pulseDetailsFor } from "@/domain/options";
import type { Disruption, StationPulseDetail } from "@/types";
import { useDemoScenario } from "@/components/demo";
import { useGer4kStore } from "./Ger4kStore";

/**
 * Shared client hooks over the local DataProvider. Everything is computed
 * in-memory; the only network call in the app remains Ask GER4K.
 */

/** Mount-safe "now" (null during SSR / first paint), refreshed every 30 s. */
export function useNow(intervalMs = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Active disruptions — consumer-gated on the Demo_Scenario. */
export function useActiveDisruptions(): Disruption[] {
  const { active } = useDemoScenario();
  return useMemo(() => (active ? mockDataProvider.getDisruptions() : []), [active]);
}

/** Station id → display name. */
export function stationName(id: string): string {
  return demoStations.find((s) => s.id === id)?.name ?? id;
}

/**
 * Pulse details for every fixture station: seeded + submitted reports, plus
 * scenario-only seeds while the Demo_Scenario is active. Re-aggregates when the
 * minute changes or the passenger submits a report.
 */
export function useStationPulse(): {
  pulse: Map<string, StationPulseDetail>;
  now: number;
  ready: boolean;
} {
  const { active } = useDemoScenario();
  const { reportsVersion } = useGer4kStore();
  const tick = useNow(30_000);
  const now = tick ?? 0;

  const pulse = useMemo(() => {
    if (tick === null) return new Map<string, StationPulseDetail>();
    return pulseDetailsFor(
      demoStations.map((s) => s.id),
      (id) => [
        ...mockDataProvider.getReports(id),
        ...(active ? mockDataProvider.getScenarioReports(id) : []),
      ],
      tick,
    );
    // reportsVersion forces re-aggregation after a submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, active, reportsVersion]);

  return { pulse, now, ready: tick !== null };
}

export { historicalDemandDataset };
