import { Footprints, Repeat } from "lucide-react";

import { cn } from "@/components/ui";
import { changesText, formatRm, formatWalk } from "./lineStyle";

/**
 * StatCluster — the dominant ETA plus fare / changes / walking (Requirement
 * 40.1). The ETA leads at hero size; the rest are quiet supporting metrics.
 * Purely presentational.
 */
export function StatCluster({
  timeMin,
  fareSen,
  transfers,
  walkMeters,
  clock,
  className,
}: {
  timeMin: number;
  fareSen?: number;
  transfers: number;
  walkMeters: number;
  /** Optional "08:30 → 08:47" clock string. */
  clock?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-1">
        <span className="flex items-baseline gap-1.5">
          <span className="font-sans text-hero font-bold tracking-tight text-foreground">{timeMin}</span>
          <span className="text-title font-semibold text-foreground-muted">min</span>
        </span>
        {fareSen !== undefined ? (
          <span className="pb-1 text-metric font-semibold text-foreground">{formatRm(fareSen)}</span>
        ) : null}
        {clock ? <span className="pb-1.5 text-body text-foreground-muted">{clock}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body text-foreground-muted">
        <span className="inline-flex items-center gap-1.5">
          <Repeat className="size-4 text-foreground-subtle" aria-hidden="true" />
          {changesText(transfers)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Footprints className="size-4 text-foreground-subtle" aria-hidden="true" />
          {formatWalk(walkMeters)} walking
        </span>
      </div>
    </div>
  );
}

export default StatCluster;
