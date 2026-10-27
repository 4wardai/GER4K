"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Megaphone, Trophy } from "lucide-react";

import { demoStations } from "@/data";
import { contributorLevel } from "@/domain/community";
import { Button, cn } from "@/components/ui";
import { useGer4kStore } from "@/components/state/Ger4kStore";
import { useNow, useStationPulse } from "@/components/state/useLiveData";
import { ConditionPill, LineBadge, trendText } from "@/components/transit/TransitBits";
import { StationPicker } from "@/components/search/StationPicker";
import { useDemoScenario } from "@/components/demo";

import { freshnessText, reportsText, severityRank } from "./pulseCopy";

/**
 * Pulse — browse wider station conditions (Requirement 24.4). Aggregation
 * first, worst first; quick structured reporting; the passenger's points.
 */
export default function PulseScreen() {
  const { pulse, ready } = useStationPulse();
  const now = useNow(30_000);
  const { openStation, points, saved, recents } = useGer4kStore();
  const { active } = useDemoScenario();
  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState<"all" | "mine">("all");

  const mine = useMemo(() => {
    const ids = new Set<string>();
    for (const s of saved) [s.originId, s.destinationId].forEach((x) => ids.add(x));
    for (const r of recents) [r.originId, r.destinationId].forEach((x) => ids.add(x));
    return ids;
  }, [saved, recents]);

  const rows = demoStations
    .filter((s) => filter === "all" || mine.has(s.id))
    .map((s) => ({ s, d: pulse.get(s.id) }))
    .sort((a, b) => severityRank(b.d) - severityRank(a.d) || a.s.name.localeCompare(b.s.name));
  const reported = rows.filter((r) => (r.d?.summary.reportCount ?? 0) > 0);
  const quiet = rows.filter((r) => (r.d?.summary.reportCount ?? 0) === 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-heading font-bold tracking-tight text-foreground sm:text-display">Station Pulse</h1>
          <p className="max-w-xl text-body text-foreground-muted">
            What commuters are reporting right now, aggregated over the last 30 minutes.
            {" "}
            <span className="text-foreground-subtle">Includes seeded demo reports{active ? " and simulated scenario reports" : ""}.</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/profile"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-caption font-semibold text-foreground hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
          >
            <Trophy className="size-4 text-violet" aria-hidden="true" />
            {points.total} points · {contributorLevel(points.acceptedReports)}
          </Link>
          <Button size="lg" onClick={() => setPicking(true)}>
            <Megaphone className="size-5" aria-hidden="true" />
            Report a condition
          </Button>
        </div>
      </header>

      <div role="radiogroup" aria-label="Filter stations" className="flex gap-2">
        {(
          [
            ["all", "All stations"],
            ["mine", "On my journeys"],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={filter === v}
            onClick={() => setFilter(v)}
            className={cn(
              "h-10 rounded-full px-4 text-caption font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet",
              filter === v ? "bg-foreground text-white" : "bg-surface text-foreground hover:bg-navy-800",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {!ready ? (
        <div className="h-64 animate-pulse rounded-2xl bg-surface" aria-hidden="true" />
      ) : (
        <>
          {reported.length > 0 ? (
            <section aria-labelledby="reported-heading" className="flex flex-col gap-3">
              <h2 id="reported-heading" className="text-title font-semibold text-foreground">Reported now</h2>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {reported.map(({ s, d }) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => openStation(s.id)}
                      className="flex h-full w-full flex-col gap-2.5 rounded-2xl border border-border bg-surface px-5 py-4 text-left shadow-sm hover:bg-navy-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-title font-semibold text-foreground">{s.name}</span>
                        <ChevronRight className="mt-1 size-4 text-foreground-subtle" aria-hidden="true" />
                      </span>
                      <ConditionPill condition={d!.summary.condition} size="lg" />
                      <span className="text-caption text-foreground-muted">
                        {reportsText(d!.summary.reportCount)} · {freshnessText(d!.summary.mostRecentAt, now)} · {d!.summary.confidence.band} confidence
                      </span>
                      {trendText(d!.trend) ? (
                        <span className="text-caption font-semibold text-critical">{trendText(d!.trend)}</span>
                      ) : null}
                      {d!.signals.length > 0 ? (
                        <span className="text-caption font-medium text-foreground">Also: {d!.signals.map((x) => x.type).join(", ")}</span>
                      ) : null}
                      <span className="mt-auto flex flex-wrap gap-1">
                        {s.lines.map((l) => (
                          <LineBadge key={l} leg={{ lineId: l, mode: "", walkMeters: 0 }} />
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="rounded-2xl bg-surface px-5 py-6 text-body text-foreground-muted">
              No recent reports for these stations. Be the first to report.
            </p>
          )}

          {quiet.length > 0 ? (
            <section aria-labelledby="quiet-heading" className="flex flex-col gap-3">
              <h2 id="quiet-heading" className="text-title font-semibold text-foreground">No recent reports</h2>
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {quiet.map(({ s }) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => openStation(s.id)}
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-navy-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet"
                    >
                      <span className="flex-1 text-body font-semibold text-foreground">{s.name}</span>
                      <span className="text-caption text-foreground-muted">Tap to report</span>
                      <ChevronRight className="size-4 text-foreground-subtle" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <StationPicker
        open={picking}
        title="Which station are you at?"
        onClose={() => setPicking(false)}
        onPick={(id) => {
          setPicking(false);
          openStation(id, "report");
        }}
      />
    </div>
  );
}
