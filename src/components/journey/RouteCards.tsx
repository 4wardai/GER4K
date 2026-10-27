"use client";

import { Car, ChevronRight, Footprints, Sparkles, TriangleAlert } from "lucide-react";

import type {
  Disruption,
  JourneyOption,
  PreferenceProfile,
  RideHailEstimate,
  StationPulseDetail,
} from "@/types";
import { PREFERENCE_PROFILES } from "@/types";
import { cn } from "@/components/ui";
import { stationName } from "@/components/state/useLiveData";
import {
  changesText,
  clockAt,
  formatMinutes,
  formatRm,
  formatWalk,
  lineInfoFor,
} from "@/components/transit/lineStyle";
import { ConditionPill, HonestyChip } from "@/components/transit/TransitBits";
import { StatCluster } from "@/components/transit/StatCluster";
import { TransportModeSequence } from "@/components/transit/TransportModeSequence";

import { ConfidenceSummary } from "./ConfidenceSummary";

/** Stations on an option with a notable Pulse condition (worst first). */
function notablePulse(option: JourneyOption, pulse: Map<string, StationPulseDetail>) {
  return option.touchStationIds
    .map((id) => ({ id, d: pulse.get(id) }))
    .filter((x) => x.d && x.d.summary.reportCount > 0 && x.d.summary.condition !== "Normal")
    .sort((a, b) => {
      const sev = { Normal: 0, Busy: 1, Packed: 2, "Severe disruption": 3 };
      return sev[b.d!.summary.condition] - sev[a.d!.summary.condition];
    })
    .slice(0, 2);
}

// ── Journey changed banner ─────────────────────────────────────────────────

export function JourneyChangedBanner({ disruptions }: { disruptions: Disruption[] }) {
  const d = disruptions[0];
  if (!d) return null;
  const line = lineInfoFor(d.affectedSegment.line);
  return (
    <section
      aria-label="Your journey has changed"
      role="alert"
      className="flex items-start gap-3.5 rounded-3xl border border-critical/25 bg-critical/[0.06] px-5 py-4 animate-[riseIn_200ms_ease-out]"
    >
      <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-critical text-white">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-heading font-bold leading-tight text-foreground">Your journey has changed</p>
        <p className="text-title font-semibold text-foreground">
          {line?.name ?? "Rail"} disruption
        </p>
        <p className="text-body font-medium text-foreground-muted">
          {stationName(d.affectedSegment.from)} <span className="text-foreground-subtle">→</span> {stationName(d.affectedSegment.to)} · trains not running. GER4K re-planned your trip.
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {d.isSimulated ? <HonestyChip tone="simulated">Simulated demo</HonestyChip> : null}
          {d.sourceStatus === "UNVERIFIED" ? <HonestyChip>Unverified</HonestyChip> : null}
        </div>
      </div>
    </section>
  );
}

// ── Hero recommendation ─────────────────────────────────────────────────────

export function RouteHero({
  option,
  recovery,
  pulse,
  departMs,
  onWhy,
  onStation,
  selected,
  onSelect,
}: {
  option: JourneyOption;
  recovery: boolean;
  pulse: Map<string, StationPulseDetail>;
  departMs: number | null;
  /** Opens the explanation of why this option is recommended. */
  onWhy: () => void;
  onStation: (id: string) => void;
  selected: boolean;
  onSelect: () => void;
}) {
  const j = option.journey;
  const strategy = option.strategies[0];
  const notable = notablePulse(option, pulse);
  return (
    <article
      aria-label={`Recommended: ${option.title}`}
      className={cn(
        "flex flex-col gap-4 rounded-3xl border bg-surface px-5 py-5 shadow-[var(--shadow-hero)] transition-shadow sm:px-6",
        selected ? "border-violet/50 ring-2 ring-violet/20" : "border-border",
      )}
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-title font-bold text-foreground sm:text-[1.375rem]">{option.title}</h3>
          {strategy ? (
            <span className="rounded-full bg-violet/10 px-3 py-1 text-caption font-bold text-violet">
              {recovery && strategy === "Fastest" ? "Fastest recovery" : strategy}
            </span>
          ) : null}
        </div>
        <StatCluster
          timeMin={j.totalTimeMin}
          fareSen={option.fare.totalSen}
          transfers={j.transfers}
          walkMeters={j.totalWalkMeters}
          clock={departMs !== null ? `${clockAt(departMs, 0)} → ${clockAt(departMs, j.totalTimeMin)}` : null}
        />
        <TransportModeSequence legs={j.legs} stationName={stationName} size="hero" />
        {!selected ? (
          <button
            type="button"
            onClick={onSelect}
            className="w-fit rounded text-caption font-semibold text-violet hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
          >
            Show on map
          </button>
        ) : null}
      </div>

      {notable.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Station conditions on this route">
          {notable.map(({ id, d }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onStation(id)}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-3 text-caption font-semibold text-foreground hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
              >
                {stationName(id)}:
                <ConditionPill condition={d!.summary.condition} size="sm" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <ConfidenceSummary confidence={option.confidence} />

      {/* Subtle tertiary explainability action — no large button. */}
      <button
        type="button"
        onClick={onWhy}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg text-caption font-semibold text-violet hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        Why this recommendation?
      </button>

      {option.isSimulated ? (
        <p className="text-caption text-foreground-muted">
          <HonestyChip tone="simulated" className="mr-1.5">Simulated</HonestyChip>
          Uses a replacement bus that only exists in the demo scenario.
        </p>
      ) : null}

      <p className="text-[12px] text-foreground-subtle">Scheduled times · demo fare estimate</p>
    </article>
  );
}

// ── Alternative rows ───────────────────────────────────────────────────────

const STRATEGY_COPY: Record<string, string> = {
  Fastest: "Fastest",
  Cheapest: "Cheapest",
  "Least walking": "Less walking",
  "Fewest changes": "Fewer changes",
  "Least crowded": "Avoids crowds",
};

export function RouteOptionRow({
  option,
  selected,
  onSelect,
  label,
}: {
  option: JourneyOption;
  selected: boolean;
  onSelect: () => void;
  label?: string;
}) {
  const j = option.journey;
  const tag = label ?? (option.strategies[0] ? STRATEGY_COPY[option.strategies[0]] : "Alternative");
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border px-4 py-3.5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet",
        selected ? "border-violet bg-violet/[0.05]" : "border-border bg-surface hover:bg-navy-800/50",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="text-caption font-bold uppercase tracking-wide text-violet">{tag}</span>
          <span className="text-body font-semibold text-foreground">{option.title}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="text-title font-bold text-foreground">{formatMinutes(j.totalTimeMin)}</span>
          <span className="text-caption font-semibold text-foreground-muted">{formatRm(option.fare.totalSen)}</span>
        </span>
      </span>
      <TransportModeSequence legs={j.legs} stationName={stationName} size="row" />
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-foreground-muted">
        <span>{changesText(j.transfers)}</span>
        <span className="inline-flex items-center gap-1">
          <Footprints className="size-3.5" aria-hidden="true" />
          {formatWalk(j.totalWalkMeters)}
        </span>
        <span>{option.confidence.band} confidence</span>
        {option.isSimulated ? <HonestyChip tone="simulated">Simulated</HonestyChip> : null}
      </span>
    </button>
  );
}

/** True when the option's main ride is a bus or replacement bus. */
export function optionIsBus(option: JourneyOption): boolean {
  return option.journey.legs.some((l) => {
    if (l.legKind === "walk" || l.legKind === "ride-hail") return false;
    const info = lineInfoFor(l.lineId ?? l.line);
    return info?.kind === "bus" || info?.kind === "replacement-bus";
  });
}

export function RideHailRow({
  estimate,
  selected,
  onSelect,
}: {
  estimate: RideHailEstimate;
  selected: boolean;
  onSelect: () => void;
}) {
  const [tLow, tHigh] = estimate.totalMinRange;
  const [cLow, cHigh] = estimate.totalCostSenRange;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border border-dashed px-4 py-3.5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet",
        selected ? "border-foreground bg-navy-800/60" : "border-foreground-subtle/60 bg-surface hover:bg-navy-800/40",
      )}
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-white">
        <Car className="size-4.5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-caption font-bold uppercase tracking-wide text-foreground-muted">Need it faster?</span>
        <span className="text-body font-semibold text-foreground">
          Rail to {stationName(estimate.hailStationId)} + ride-hailing
        </span>
        <span className="text-caption text-foreground-muted">
          {estimate.rideMinRange[0]}–{estimate.rideMinRange[1]} min by car from {stationName(estimate.hailStationId)} · {estimate.roadKm} km.
          Not a booking; GER4K has no ride-hailing partner.
        </span>
        <HonestyChip className="self-start">Demo price estimate</HonestyChip>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-title font-bold text-foreground">{tLow}–{tHigh} min</span>
        <span className="text-caption font-semibold text-foreground-muted">
          RM{(cLow / 100).toFixed(0)}–{(cHigh / 100).toFixed(0)}
        </span>
      </span>
    </button>
  );
}

// ── Profile chips ──────────────────────────────────────────────────────────

const PROFILE_LABEL: Record<PreferenceProfile, string> = {
  Balanced: "Balanced",
  Fastest: "Fastest",
  Cheapest: "Cheapest",
  "Least Walking": "Less walking",
  "Fewest Transfers": "Fewer changes",
  "Avoid Crowding": "Avoid crowds",
  Accessible: "Accessible",
};

export function ProfileChips({
  value,
  onChange,
}: {
  value: PreferenceProfile;
  onChange: (p: PreferenceProfile) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="What matters most?"
      className={cn(
        // Horizontal scroll on mobile (edge-to-edge), wrap on larger screens.
        "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0",
      )}
    >
      {PREFERENCE_PROFILES.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p)}
            className={cn(
              "h-11 shrink-0 snap-start rounded-full border px-4 text-body font-semibold transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet",
              active
                ? "border-foreground bg-foreground text-white shadow-sm"
                : "border-border bg-surface text-foreground hover:bg-navy-800",
            )}
          >
            {PROFILE_LABEL[p]}
          </button>
        );
      })}
    </div>
  );
}

export function profileLabel(p: PreferenceProfile): string {
  return PROFILE_LABEL[p];
}

/** "See details" affordance used under the option list. */
export function MoreLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-1 rounded-lg px-1 text-caption font-semibold text-violet hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
    >
      {children}
      <ChevronRight className="size-4" aria-hidden="true" />
    </button>
  );
}
