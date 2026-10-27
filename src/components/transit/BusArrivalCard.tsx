"use client";

import { Bus } from "lucide-react";

import { cn } from "@/components/ui";
import { lineInfoFor } from "./lineStyle";
import { HonestyChip } from "./TransitBits";

/**
 * BusArrivalCard — reusable bus / feeder treatment (Requirement 40.3). Makes a
 * bus a legitimate transport strategy: service badge in its line colour, a
 * dominant arrival estimate, direction/headsign and an honest source label
 * (SCHEDULED for GTFS-backed services, SIMULATED LIVE DATA for mocked arrivals).
 * Purely presentational.
 *
 * `as="button"` makes it actionable (recovery bus option); otherwise it renders
 * as a static row (Home nearby transport).
 */
export interface BusArrivalCardProps {
  /** Service code shown in the badge, e.g. "300", "T509". */
  code: string;
  /** "Rapid KL bus" / "MRT feeder" / "Replacement bus". */
  kind: string;
  /** Headsign or direction line. */
  headsign: string;
  /** Arrival estimate in minutes (simulated), or null to hide it. */
  arrivalMin: number | null;
  /** True when the arrival countdown is simulated (shows SIMULATED LIVE DATA). */
  simulatedArrival?: boolean;
  /** Optional line id to colour the badge; defaults to transit blue. */
  lineId?: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function BusArrivalCard({
  code,
  kind,
  headsign,
  arrivalMin,
  simulatedArrival = true,
  lineId,
  selected,
  onClick,
  className,
}: BusArrivalCardProps) {
  const colour = lineInfoFor(lineId)?.colour ?? "#1D4ED8";
  const interactive = typeof onClick === "function";
  const Tag = interactive ? "button" : "div";

  return (
    <Tag
      {...(interactive ? { type: "button" as const, onClick, "aria-pressed": selected } : {})}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border bg-surface px-4 py-3 text-left",
        interactive &&
          "transition-colors hover:bg-navy-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet",
        selected ? "border-violet bg-violet/[0.05]" : "border-border",
        className,
      )}
    >
      <span
        className="flex h-9 min-w-[3.25rem] shrink-0 items-center justify-center gap-1 rounded-lg px-2 text-body font-extrabold"
        style={{ backgroundColor: colour, color: "#FFFFFF" }}
      >
        <Bus className="size-4" aria-hidden="true" />
        {code}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-semibold text-foreground">{headsign}</span>
        <span className="flex flex-wrap items-center gap-1.5 text-caption text-foreground-muted">
          {kind}
          {simulatedArrival ? (
            <HonestyChip>Simulated live data</HonestyChip>
          ) : (
            <HonestyChip>Scheduled</HonestyChip>
          )}
        </span>
      </span>
      {arrivalMin !== null ? (
        <span className="shrink-0 text-right">
          <span className="block text-metric font-bold leading-none text-foreground">{arrivalMin}</span>
          <span className="text-caption text-foreground-subtle">min</span>
        </span>
      ) : null}
    </Tag>
  );
}

export default BusArrivalCard;
