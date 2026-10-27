import { Bus, Car, ChevronRight, Footprints, TrainFront } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/components/ui";
import type { JourneyLeg, PulseTrend, StationCondition } from "@/types";

import { legVisual } from "./lineStyle";
import type { LegIcon } from "./lineStyle";

/**
 * Small transit presentation pieces: leg icons, line badges, the transport
 * sequence, Pulse condition indicators and quiet honesty chips. All carry text
 * (never colour alone).
 */

export function LegIconGlyph({ icon, className }: { icon: LegIcon; className?: string }) {
  const cls = cn("size-4 shrink-0", className);
  if (icon === "bus") return <Bus className={cls} strokeWidth={2.25} aria-hidden="true" />;
  if (icon === "walk") return <Footprints className={cls} strokeWidth={2.25} aria-hidden="true" />;
  if (icon === "car") return <Car className={cls} strokeWidth={2.25} aria-hidden="true" />;
  return <TrainFront className={cls} strokeWidth={2.25} aria-hidden="true" />;
}

/** A line badge in the official line colour, e.g. [🚆 PYL]. */
export function LineBadge({
  leg,
  showLabel = false,
  className,
}: {
  leg: Pick<JourneyLeg, "legKind" | "lineId" | "line" | "mode" | "walkMeters">;
  showLabel?: boolean;
  className?: string;
}) {
  const v = legVisual(leg);
  if (v.icon === "walk") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-caption font-semibold text-foreground-muted", className)}>
        <LegIconGlyph icon="walk" />
        {leg.walkMeters ? `${leg.walkMeters} m` : "Walk"}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-caption font-bold leading-none",
        className,
      )}
      style={{ backgroundColor: v.colour, color: v.textColour }}
      title={v.label}
    >
      <LegIconGlyph icon={v.icon} className="size-3.5" />
      <span>{showLabel ? v.label : v.short}</span>
    </span>
  );
}

/** The visual transport sequence: badge › station › badge › … */
export function RouteSequence({
  legs,
  stationName,
  compact = false,
  className,
}: {
  legs: JourneyLeg[];
  stationName: (id: string) => string;
  compact?: boolean;
  className?: string;
}) {
  const visible = compact ? legs.filter((l) => l.legKind !== "walk" || l.walkMeters >= 300) : legs;
  const summary = visible.map((l) => `${legVisual(l).label} to ${stationName(l.to)}`).join(", then ");
  // Spans (not a list) so the sequence can sit inside buttons; the summary is
  // exposed as text for assistive tech.
  return (
    <span className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1.5", className)}>
      <span className="sr-only">Route: {summary}.</span>
      {visible.map((leg, i) => (
        <span key={`${leg.from}-${leg.to}-${i}`} className="flex items-center gap-1.5" aria-hidden="true">
          {i > 0 ? <ChevronRight className="size-3.5 text-foreground-subtle" /> : null}
          <LineBadge leg={leg} />
          {!compact && i < visible.length - 1 ? (
            <span className="text-caption font-medium text-foreground-muted">{stationName(leg.to)}</span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

const CONDITION_STYLE: Record<StationCondition, { dot: string; text: string; label: string }> = {
  Normal: { dot: "bg-success", text: "text-success", label: "Normal" },
  Busy: { dot: "bg-warning", text: "text-[#B45309]", label: "Busy" },
  Packed: { dot: "bg-critical", text: "text-critical", label: "Packed" },
  "Severe disruption": { dot: "bg-critical", text: "text-critical", label: "Severe" },
};

export function conditionLabel(c: StationCondition): string {
  return CONDITION_STYLE[c].label;
}

/** Condition indicator: shaped dot + word. */
export function ConditionPill({
  condition,
  noReports = false,
  size = "md",
  className,
}: {
  condition: StationCondition;
  noReports?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (noReports) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-caption font-medium text-foreground-subtle", className)}>
        <span className="size-2.5 rounded-full border-2 border-foreground-subtle" aria-hidden="true" />
        No reports
      </span>
    );
  }
  const s = CONDITION_STYLE[condition];
  const shape = condition === "Busy" ? "rounded-[2px] rotate-45" : condition === "Normal" ? "rounded-full" : "rounded-[3px]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-bold uppercase tracking-wide",
        size === "lg" ? "text-title" : size === "sm" ? "text-[12px]" : "text-caption",
        s.text,
        className,
      )}
    >
      <span className={cn(size === "lg" ? "size-3.5" : "size-2.5", s.dot, shape)} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export function trendText(t: PulseTrend): string | null {
  if (t === "rising") return "Crowding increasing ↗";
  if (t === "easing") return "Crowding easing ↘";
  return null;
}

/** Quiet honesty chip, e.g. "Simulated demo", "Demo fare estimate". */
export function HonestyChip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "simulated";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
        tone === "simulated" ? "bg-violet/10 text-violet" : "bg-navy-800 text-foreground-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
