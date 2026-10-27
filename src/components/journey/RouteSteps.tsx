"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Bus, CircleCheck, Footprints, Repeat, Timer } from "lucide-react";

import { mockDataProvider } from "@/data";
import { simulatedNextArrivalMin } from "@/domain/service";
import type { JourneyLeg, JourneyOption, StationPulseDetail } from "@/types";
import { Button, cn } from "@/components/ui";
import { useDemoScenario } from "@/components/demo";
import { stationName, useNow } from "@/components/state/useLiveData";
import { clockAt, directionText, formatRm, formatWalk, legVisual } from "@/components/transit/lineStyle";
import { ConditionPill, HonestyChip, LegIconGlyph } from "@/components/transit/TransitBits";
import { sourceStatusLabel } from "@/components/disruption/SourceStatusTag";

/**
 * Step-by-step route details (Requirement 21.3) and a lightweight journey mode
 * (Requirement 21.4). Interchange walks come from the network's interchange
 * records; bus arrivals are SIMULATED LIVE DATA, labelled as such.
 */

interface Step {
  leg: JourneyLeg;
  index: number;
  change?: { walkMeters: number; minutes: number; at: string } | null;
}

function buildSteps(option: JourneyOption, scenario: boolean): Step[] {
  const net = mockDataProvider.getMultimodalNetwork({ includeScenarioServices: scenario });
  return option.journey.legs.map((leg, index) => {
    const prev = option.journey.legs[index - 1];
    let change: Step["change"] = null;
    if (prev && prev.legKind !== "walk" && leg.legKind !== "walk" && prev.lineId && leg.lineId) {
      const ic = net.interchanges.find(
        (i) => i.stationId === leg.from && i.fromLineId === prev.lineId && i.toLineId === leg.lineId,
      );
      if (ic) change = { walkMeters: ic.walkMeters, minutes: ic.transferTimeMin, at: leg.from };
    }
    return { leg, index, change };
  });
}

function StationRow({
  id,
  pulse,
  onStation,
  emphasis,
  time,
}: {
  id: string;
  pulse: Map<string, StationPulseDetail>;
  onStation: (id: string) => void;
  emphasis?: boolean;
  time?: string | null;
}) {
  const d = pulse.get(id);
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-6 justify-center" aria-hidden="true">
        <span className={cn("rounded-full border-[3px] border-foreground bg-surface", emphasis ? "size-4" : "size-3.5")} />
      </span>
      <button
        type="button"
        onClick={() => onStation(id)}
        className="flex min-h-11 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
        aria-label={`${stationName(id)}${d && d.summary.reportCount > 0 ? `, ${d.summary.condition}` : ""}. Open station details`}
      >
        <span className={cn("font-semibold text-foreground", emphasis ? "text-title" : "text-body")}>{stationName(id)}</span>
        {time ? <span className="text-caption text-foreground-muted">{time}</span> : null}
        {d && d.summary.reportCount > 0 && d.summary.condition !== "Normal" ? (
          <ConditionPill condition={d.summary.condition} size="sm" />
        ) : null}
      </button>
    </div>
  );
}

function LegBlock({ step, nowMs }: { step: Step; nowMs: number | null }) {
  const { leg } = step;
  const v = legVisual(leg);
  const dir = directionText(v.info, leg.from, leg.to);
  const isBus = v.icon === "bus";
  return (
    <div className="flex items-stretch gap-3">
      <span className="flex w-6 justify-center" aria-hidden="true">
        <span
          className={cn("my-0.5 w-1.5 rounded-full", leg.legKind === "walk" && "w-0 border-l-[3px] border-dotted")}
          style={leg.legKind === "walk" ? { borderColor: v.colour } : { backgroundColor: v.colour }}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-2.5">
        {step.change ? (
          <p className="inline-flex items-center gap-1.5 text-caption font-semibold text-foreground-muted">
            <Repeat className="size-3.5" aria-hidden="true" />
            Change here · {step.change.walkMeters} m walk · ~{step.change.minutes} min
          </p>
        ) : null}
        <p className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-caption font-bold"
            style={leg.legKind === "walk" ? { backgroundColor: "#EEF2F7", color: "#334155" } : { backgroundColor: v.colour, color: v.textColour }}
          >
            <LegIconGlyph icon={v.icon} className="size-3.5" />
            {leg.legKind === "walk" ? `Walk ${formatWalk(leg.walkMeters)}` : v.label}
          </span>
          {dir ? <span className="text-caption font-medium text-foreground-muted">{dir}</span> : null}
        </p>
        <p className="text-caption text-foreground-muted">
          {leg.travelTimeMin} min
          {leg.legKind === "walk" ? " · walking estimate" : ` · ${sourceStatusLabel(leg.sourceStatus)}`}
          {leg.isSimulated ? " · simulated service" : ""}
        </p>
        {isBus && nowMs !== null ? (
          <p className="inline-flex flex-wrap items-center gap-2 text-caption font-semibold text-foreground">
            <Timer className="size-3.5 text-cyan" aria-hidden="true" />
            Next bus in ~{simulatedNextArrivalMin(leg.lineId ?? leg.mode, leg.headwayMin ?? 10, nowMs)} min
            <HonestyChip>Simulated live data</HonestyChip>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function RouteSteps({
  option,
  pulse,
  onStation,
  departMs,
}: {
  option: JourneyOption;
  pulse: Map<string, StationPulseDetail>;
  onStation: (id: string) => void;
  departMs: number | null;
}) {
  const { active } = useDemoScenario();
  const nowMs = useNow(30_000);
  const steps = buildSteps(option, active);
  let elapsed = 0;
  return (
    <ol className="flex flex-col" aria-label={`Steps for ${option.title}`}>
      {steps.map((step, i) => {
        const startAt = elapsed;
        elapsed += (step.change?.minutes ?? 0) + step.leg.travelTimeMin;
        return (
          <li key={`${step.leg.from}-${i}`}>
            {i === 0 ? (
              <StationRow id={step.leg.from} pulse={pulse} onStation={onStation} emphasis time={departMs !== null ? clockAt(departMs, 0) : null} />
            ) : null}
            <LegBlock step={step} nowMs={nowMs} />
            <StationRow
              id={step.leg.to}
              pulse={pulse}
              onStation={onStation}
              emphasis={i === steps.length - 1}
              time={departMs !== null ? clockAt(departMs, Math.min(option.journey.totalTimeMin, startAt + (step.change?.minutes ?? 0) + step.leg.travelTimeMin)) : null}
            />
          </li>
        );
      })}
    </ol>
  );
}

export function FareBreakdown({ option }: { option: JourneyOption }) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {option.fare.items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-start justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-body text-foreground">{item.label}</span>
              {item.note ? <span className="text-caption text-foreground-muted">{item.note}</span> : null}
            </span>
            <span className="text-body font-semibold text-foreground">{formatRm(item.amountSen)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="text-body font-semibold text-foreground">Estimated total</span>
        <span className="text-title font-bold text-foreground">{formatRm(option.fare.totalSen)}</span>
      </div>
      <HonestyChip className="self-start">Demo fare estimate</HonestyChip>
    </div>
  );
}

/** Lightweight journey mode: current step, next step, simulated arrivals. */
export function JourneyMode({
  option,
  onExit,
  departMs,
}: {
  option: JourneyOption;
  onExit: () => void;
  departMs: number | null;
}) {
  const [i, setI] = useState(0);
  const nowMs = useNow(30_000);
  const legs = option.journey.legs;
  const done = i >= legs.length;
  const leg = legs[Math.min(i, legs.length - 1)];
  const v = legVisual(leg);
  const dir = directionText(v.info, leg.from, leg.to);
  const next = legs[i + 1];

  return (
    <section aria-label="Journey mode" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface px-5 py-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption font-bold uppercase tracking-wide text-violet">
          {done ? "Arrived" : `Step ${i + 1} of ${legs.length}`}
        </p>
        <button type="button" onClick={onExit} className="min-h-10 rounded-lg px-2 text-caption font-semibold text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet">
          End journey
        </button>
      </div>

      {done ? (
        <div className="flex items-start gap-3" role="status">
          <CircleCheck className="size-8 text-success" aria-hidden="true" />
          <div>
            <p className="text-heading font-bold text-foreground">You&rsquo;ve arrived at {stationName(legs[legs.length - 1].to)}</p>
            <p className="text-body text-foreground-muted">Thanks for travelling with GER4K. Spotted crowding? Report it for others.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2" aria-live="polite">
          <p className="text-heading font-bold leading-tight text-foreground">
            {leg.legKind === "walk"
              ? `Walk to ${stationName(leg.to)}`
              : v.icon === "bus"
                ? `Take the ${v.label} to ${stationName(leg.to)}`
                : `Board ${v.label} at ${stationName(leg.from)}`}
          </p>
          <p className="text-body text-foreground-muted">
            {dir ? `${dir[0].toUpperCase()}${dir.slice(1)} · ` : ""}
            {leg.travelTimeMin} min
            {leg.legKind === "walk" ? ` · ${formatWalk(leg.walkMeters)}` : ` · get off at ${stationName(leg.to)}`}
          </p>
          {v.icon === "bus" && nowMs !== null ? (
            <p className="inline-flex flex-wrap items-center gap-2 text-title font-semibold text-foreground">
              <Bus className="size-5 text-cyan" aria-hidden="true" />
              Arriving in ~{simulatedNextArrivalMin(leg.lineId ?? leg.mode, leg.headwayMin ?? 10, nowMs)} min
              <HonestyChip>Simulated live data</HonestyChip>
            </p>
          ) : null}
          {next ? (
            <p className="mt-1 inline-flex items-center gap-2 rounded-xl bg-navy-800/60 px-3 py-2 text-caption font-semibold text-foreground">
              {next.legKind === "walk" ? <Footprints className="size-4" aria-hidden="true" /> : <Repeat className="size-4" aria-hidden="true" />}
              Next: {next.legKind === "walk" ? `walk to ${stationName(next.to)}` : `change to ${legVisual(next).label} at ${stationName(next.from)}`}
            </p>
          ) : null}
          {departMs !== null ? (
            <p className="text-caption text-foreground-muted">Scheduled arrival {clockAt(departMs, option.journey.totalTimeMin)}</p>
          ) : null}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" size="lg" disabled={i === 0} onClick={() => setI((x) => Math.max(0, x - 1))} aria-label="Previous step">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Button>
        {!done ? (
          <Button size="lg" fullWidth onClick={() => setI((x) => x + 1)}>
            {i === legs.length - 1 ? "I've arrived" : "Next step"}
            <ArrowRight className="size-5" aria-hidden="true" />
          </Button>
        ) : (
          <Button size="lg" fullWidth onClick={onExit}>
            Done
          </Button>
        )}
      </div>
    </section>
  );
}
