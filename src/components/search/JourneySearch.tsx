"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpDown, Clock, Navigation, Search } from "lucide-react";

import { DEMO_DESTINATION_ID, DEMO_ORIGIN_ID } from "@/data";
import { Button, cn } from "@/components/ui";
import { stationName } from "@/components/state/useLiveData";
import { useGer4kStore } from "@/components/state/Ger4kStore";

import { StationPicker } from "./StationPicker";

/**
 * JourneySearch — the dominant "Where are you going?" search (Requirements
 * 19.1, 20). Origin/destination fields open the station picker; swap; Depart
 * now / Depart at / Arrive by. Submitting opens the separate journey results.
 */

export type WhenMode = "now" | "depart" | "arrive";

export function journeyUrl(o: string, d: string, when: WhenMode, time: string): string {
  const p = new URLSearchParams({ from: o, to: d });
  if (when !== "now") {
    p.set("when", when);
    p.set("time", time);
  }
  return `/journey?${p.toString()}`;
}

function defaultTime(): string {
  const d = new Date(Date.now() + 15 * 60_000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(Math.floor(d.getMinutes() / 5) * 5).padStart(2, "0")}`;
}

export function JourneySearch({
  initialOrigin = DEMO_ORIGIN_ID,
  initialDestination = DEMO_DESTINATION_ID,
  initialWhen = "now",
  initialTime,
  submitLabel = "Find routes",
  className,
  onSubmitted,
}: {
  initialOrigin?: string;
  initialDestination?: string;
  initialWhen?: WhenMode;
  initialTime?: string;
  submitLabel?: string;
  className?: string;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const { addRecent } = useGer4kStore();
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [when, setWhen] = useState<WhenMode>(initialWhen);
  const [time, setTime] = useState(initialTime ?? "08:30");
  const [picker, setPicker] = useState<"from" | "to" | null>(null);

  useEffect(() => {
    if (!initialTime) setTime(defaultTime());
  }, [initialTime]);

  const same = origin === destination;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (same) return;
    addRecent(origin, destination);
    router.push(journeyUrl(origin, destination, when, time));
    onSubmitted?.();
  }

  return (
    <form onSubmit={submit} className={cn("flex flex-col gap-4", className)} aria-label="Plan a journey">
      <div className="relative flex flex-col rounded-2xl border border-border bg-surface">
        <FieldButton
          label="From"
          value={stationName(origin)}
          marker={<span className="size-3 rounded-full border-[3px] border-foreground" aria-hidden="true" />}
          onClick={() => setPicker("from")}
        />
        <div className="ml-12 border-t border-border" />
        <FieldButton
          label="To"
          value={stationName(destination)}
          marker={<Navigation className="size-4 fill-violet text-violet" aria-hidden="true" />}
          onClick={() => setPicker("to")}
        />
        <button
          type="button"
          onClick={() => {
            setOrigin(destination);
            setDestination(origin);
          }}
          aria-label="Swap origin and destination"
          className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted shadow-sm hover:bg-navy-800 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
        >
          <ArrowUpDown className="size-5" aria-hidden="true" />
        </button>
      </div>

      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">When</legend>
        <Clock className="size-4 text-foreground-muted" aria-hidden="true" />
        {(
          [
            ["now", "Depart now"],
            ["depart", "Depart at"],
            ["arrive", "Arrive by"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={when === value}
            onClick={() => setWhen(value)}
            className={cn(
              "h-10 rounded-full px-3.5 text-caption font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet",
              when === value ? "bg-foreground text-white" : "bg-navy-800 text-foreground hover:bg-navy-700",
            )}
          >
            {label}
          </button>
        ))}
        {when !== "now" ? (
          <label className="flex items-center gap-2">
            <span className="sr-only">{when === "arrive" ? "Arrival time" : "Departure time"}</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-10 rounded-full border border-border bg-surface px-3 text-caption font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
            />
          </label>
        ) : null}
      </fieldset>

      {same ? (
        <p className="text-caption font-medium text-foreground-muted" role="status">
          Origin and destination are the same — pick a different destination.
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth disabled={same} className="h-14 text-title">
        <Search className="size-5" aria-hidden="true" />
        {submitLabel}
      </Button>

      <StationPicker
        open={picker !== null}
        title={picker === "from" ? "Choose a starting station" : "Where to?"}
        excludeId={picker === "from" ? destination : origin}
        onClose={() => setPicker(null)}
        onPick={(id) => {
          if (picker === "from") setOrigin(id);
          else setDestination(id);
          setPicker(null);
        }}
      />
    </form>
  );
}

function FieldButton({
  label,
  value,
  marker,
  onClick,
}: {
  label: string;
  value: string;
  marker: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[68px] w-full items-center gap-4 rounded-2xl px-4 pr-16 text-left hover:bg-navy-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet"
      aria-label={`${label}: ${value}. Change`}
    >
      <span className="flex w-4 justify-center">{marker}</span>
      <span className="flex min-w-0 flex-col">
        <span className="text-caption font-semibold text-foreground-muted">{label}</span>
        <span className="truncate text-title font-semibold text-foreground">{value}</span>
      </span>
    </button>
  );
}

export default JourneySearch;
