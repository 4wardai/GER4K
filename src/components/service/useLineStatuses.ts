"use client";

import { useMemo } from "react";

import { lineInfo, mockDataProvider } from "@/data";
import { deriveLineStatuses } from "@/domain/service";
import type { LineStatus, PulseSummary } from "@/types";
import { stationName, useActiveDisruptions, useStationPulse } from "@/components/state/useLiveData";

/** Rail line statuses: service notice (demo feed / scenario) + community notes. */
export function useLineStatuses(): LineStatus[] {
  const disruptions = useActiveDisruptions();
  const { pulse } = useStationPulse();
  return useMemo(() => {
    const summaries = new Map<string, PulseSummary>();
    for (const [id, d] of pulse) summaries.set(id, d.summary);
    return deriveLineStatuses(
      lineInfo.filter((l) => l.kind === "rail"),
      mockDataProvider.getNetwork(),
      disruptions,
      summaries,
      stationName,
    );
  }, [disruptions, pulse]);
}
