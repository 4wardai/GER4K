"use client";

import { useEffect, useId, useState } from "react";
import { Accessibility, ChevronDown, History, Megaphone } from "lucide-react";

import { demoStations } from "@/data";
import { describeDemand, historicalDemandFor } from "@/domain/demand";
import { reportTypeOf } from "@/domain/community";
import { Button, cn } from "@/components/ui";
import { Sheet } from "@/components/ui/Sheet";
import { SourceStatusTag } from "@/components/disruption/SourceStatusTag";
import { useGer4kStore } from "@/components/state/Ger4kStore";
import { historicalDemandDataset, useNow, useStationPulse } from "@/components/state/useLiveData";
import { ConditionPill, HonestyChip, LineBadge, trendText } from "@/components/transit/TransitBits";

import { ageText, conditionSentence, freshnessText, reportsText } from "./pulseCopy";
import { QuickReport } from "./QuickReport";

/**
 * StationSheet — the global station detail (Requirement 24.2). Opened from map
 * markers, route steps, Pulse, Service. Aggregate first; reports, history and
 * sources on demand.
 */
export function StationSheet() {
  const { stationSheetId, stationSheetMode, closeStation } = useGer4kStore();
  const { pulse } = useStationPulse();
  const now = useNow(30_000);
  const [mode, setMode] = useState<"view" | "report">("view");
  const [showReports, setShowReports] = useState(false);
  const listId = useId();

  useEffect(() => {
    setMode(stationSheetMode);
    setShowReports(false);
  }, [stationSheetId, stationSheetMode]);

  const station = demoStations.find((s) => s.id === stationSheetId);
  if (!station) return null;

  const detail = pulse.get(station.id);
  const summary = detail?.summary;
  const count = summary?.reportCount ?? 0;
  const demand = historicalDemandFor(historicalDemandDataset, station.id);
  const trend = detail ? trendText(detail.trend) : null;
  const anySimulated = !!detail && (detail.summary.isSimulated || detail.signals.some((s) => s.isSimulated));

  return (
    <Sheet
      open
      onClose={closeStation}
      side="right"
      eyebrow={
        <span className="mt-0.5 flex flex-wrap gap-1.5">
          {station.lines.map((l) => (
            <LineBadge key={l} leg={{ lineId: l, mode: "", walkMeters: 0 }} />
          ))}
        </span>
      }
      title={<span className="text-heading">{station.name}</span>}
    >
      {mode === "report" ? (
        <QuickReport stationId={station.id} stationName={station.name} onDone={() => setMode("view")} />
      ) : (
        <div className="flex flex-col gap-5">
          {/* 1 — Current condition (aggregate first) */}
          <section className="flex flex-col gap-2" aria-label="Current conditions">
            {summary ? (
              <ConditionPill condition={summary.condition} noReports={count === 0} size="lg" />
            ) : null}
            <p className="text-title font-semibold text-foreground">
              {conditionSentence(summary?.condition ?? "Normal", count)}
            </p>
            <p className="text-body text-foreground-muted">
              {reportsText(count)} · {freshnessText(summary?.mostRecentAt ?? null, now)}
              {count > 0 && summary ? ` · ${summary.confidence.band} confidence` : ""}
            </p>
            {trend ? <p className="text-body font-semibold text-critical">{trend}</p> : null}
            {detail && detail.signals.length > 0 ? (
              <ul className="mt-1 flex flex-wrap gap-2" aria-label="Also reported">
                {detail.signals.map((s) => (
                  <li key={s.type} className="inline-flex items-center gap-1.5 rounded-full bg-navy-800 px-3 py-1.5 text-caption font-semibold text-foreground">
                    <Megaphone className="size-3.5 text-foreground-muted" aria-hidden="true" />
                    {s.type}
                    {s.count > 1 ? <span className="text-foreground-muted">×{s.count}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {/* 2 — Primary action (before any explanatory text) */}
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => setMode("report")}>
              <Megaphone className="size-4.5" aria-hidden="true" />
              Report condition
            </Button>
            {detail && detail.recentReports.length > 0 ? (
              <Button
                variant="secondary"
                size="lg"
                aria-expanded={showReports}
                aria-controls={listId}
                onClick={() => setShowReports((v) => !v)}
              >
                See reports
                <ChevronDown className={cn("size-4 transition-transform", showReports && "rotate-180")} aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          {showReports && detail ? (
            <ul id={listId} className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {detail.recentReports.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-body font-semibold text-foreground">{reportTypeOf(r)}</span>
                    <span className="text-caption text-foreground-muted">
                      {ageText(r.timestamp, now)}
                      {r.isSimulated ? " · seeded demo report" : r.sourceStatus === "UNVERIFIED" ? " · just reported" : ""}
                    </span>
                  </div>
                  <SourceStatusTag status={r.sourceStatus} />
                </li>
              ))}
            </ul>
          ) : null}

          {/* Historical demand — never live */}
          {demand ? (
            <section className="flex flex-col gap-1.5 rounded-2xl bg-navy-800/60 px-4 py-3.5" aria-label="Historical demand">
              <div className="flex flex-wrap items-center gap-2">
                <History className="size-4 text-foreground-muted" aria-hidden="true" />
                <span className="text-body font-semibold text-foreground">Historical demand: {demand.band}</span>
                <HonestyChip>Historical</HonestyChip>
              </div>
              <p className="text-caption text-foreground-muted">{describeDemand(demand)}</p>
              <p className="text-[12px] text-foreground-subtle">
                Weekday average, {historicalDemandDataset.window[0]} to {historicalDemandDataset.window[1]}, from
                data.gov.my Rapid Rail origin-destination ridership. Tap-in/tap-out data does not count passengers
                changing lines inside the station, so interchange demand is understated. Not live crowding.
              </p>
            </section>
          ) : null}

          {station.isOKU ? (
            <p className="flex items-start gap-2 text-caption text-foreground-muted">
              <Accessibility className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Listed as OKU-friendly in official GTFS station data. GER4K has no live lift or escalator status.
            </p>
          ) : null}

          <p className="text-[12px] text-foreground-subtle">
            Community reports are aggregated over 30 minutes; recent reports count double.
            {anySimulated ? " Includes seeded demo reports (simulated)." : ""}
          </p>
        </div>
      )}
    </Sheet>
  );
}

export default StationSheet;
