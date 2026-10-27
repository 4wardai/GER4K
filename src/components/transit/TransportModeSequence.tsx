import { ChevronRight } from "lucide-react";

import { cn } from "@/components/ui";
import type { JourneyLeg } from "@/types";

import { legVisual } from "./lineStyle";
import { LegIconGlyph } from "./TransitBits";

/**
 * TransportModeSequence — the instantly-recognisable mode chain for a journey
 * (Requirement 40.2). Each ride leg is a coloured pill (official line colour +
 * mode icon); walking is a quiet footprints chip. Purely presentational.
 *
 * `size="hero"` is used in the dominant recommendation; `size="row"` in compact
 * option rows. Short walks are hidden in `row` size to keep rows calm.
 */
export function TransportModeSequence({
  legs,
  stationName,
  size = "hero",
  className,
}: {
  legs: JourneyLeg[];
  stationName: (id: string) => string;
  size?: "hero" | "row";
  className?: string;
}) {
  const compact = size === "row";
  const visible = compact ? legs.filter((l) => l.legKind !== "walk" || l.walkMeters >= 300) : legs;
  const summary = visible.map((l) => `${legVisual(l).label} to ${stationName(l.to)}`).join(", then ");

  return (
    <span className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-2", className)}>
      <span className="sr-only">Route: {summary}.</span>
      {visible.map((leg, i) => {
        const v = legVisual(leg);
        const isWalk = v.icon === "walk";
        return (
          <span key={`${leg.from}-${leg.to}-${i}`} className="flex items-center gap-x-1.5 gap-y-2" aria-hidden="true">
            {i > 0 ? <ChevronRight className="size-4 shrink-0 text-foreground-subtle" /> : null}
            {isWalk ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg bg-navy-800 px-2 font-semibold text-foreground-muted",
                  compact ? "h-7 text-caption" : "h-8 text-caption",
                )}
              >
                <LegIconGlyph icon="walk" className="size-3.5" />
                {leg.walkMeters ? `${leg.walkMeters} m` : "Walk"}
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg font-bold leading-none",
                  compact ? "h-7 px-2 text-caption" : "h-8 px-2.5 text-body",
                )}
                style={{ backgroundColor: v.colour, color: v.textColour }}
                title={v.label}
              >
                <LegIconGlyph icon={v.icon} className={compact ? "size-3.5" : "size-4"} />
                {v.short}
              </span>
            )}
            {!compact && i < visible.length - 1 && !isWalk ? (
              <span className="text-caption font-medium text-foreground-muted">{stationName(leg.to)}</span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

export default TransportModeSequence;
