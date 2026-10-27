"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, Clock, Star, Trophy } from "lucide-react";

import { mockDataProvider, nearbyServices, DEMO_ORIGIN_ID, DEMO_DESTINATION_ID } from "@/data";
import { isNoRouteFound, planJourneyOnNetwork } from "@/domain/transport";
import { computeJourneyFare } from "@/domain/fare";
import { simulatedNextArrivalMin } from "@/domain/service";
import { cn } from "@/components/ui";
import { JourneySearch } from "@/components/search/JourneySearch";
import { TransitMap } from "@/components/map/TransitMap";
import { Ger4kMark } from "@/components/layout/Ger4kMark";
import { ProactiveAlertCard, journeyHref, useSavedJourneyAlerts } from "@/components/alerts/alerts";
import { ServiceStatusRow } from "@/components/transit/ServiceStatusRow";
import { BusArrivalCard } from "@/components/transit/BusArrivalCard";
import { SectionHeader } from "@/components/transit/SectionHeader";
import { useLineStatuses } from "@/components/service/useLineStatuses";
import { useDemoScenario } from "@/components/demo";
import { useGer4kStore } from "@/components/state/Ger4kStore";
import { stationName, useActiveDisruptions, useNow, useStationPulse } from "@/components/state/useLiveData";
import { ConditionPill } from "@/components/transit/TransitBits";
import { formatRm } from "@/components/transit/lineStyle";
import { severityRank } from "@/components/pulse/pulseCopy";

/**
 * Home — search-first (Requirements 19, 39). Order of importance: search hero →
 * saved/recent (capped) → nearby transport (rail status + bus/feeder arrivals)
 * → service status rows → Pulse snapshot. Desktop: left decision panel + map.
 */
export default function HomeScreen() {
  const { saved, recents, points, hydrated, openStation } = useGer4kStore();
  const alerts = useSavedJourneyAlerts();
  const statuses = useLineStatuses();
  const disruptions = useActiveDisruptions();
  const { active } = useDemoScenario();
  const { pulse } = useStationPulse();
  const now = useNow(30_000);

  const lastSearch = recents[0];
  const initialOrigin = lastSearch?.originId ?? DEMO_ORIGIN_ID;
  const initialDestination = lastSearch?.destinationId ?? DEMO_DESTINATION_ID;

  const savedSummaries = useMemo(() => {
    const core = mockDataProvider.getNetwork();
    return saved.map((s) => {
      const plan = planJourneyOnNetwork(core, s.originId, s.destinationId);
      const usual = isNoRouteFound(plan) ? null : plan.journey;
      const fare = usual ? computeJourneyFare(usual, core, mockDataProvider.getFareRules()).totalSen : null;
      return { s, usual, fare, alert: alerts.find((a) => a.savedJourneyId === s.id) };
    });
  }, [saved, alerts]);

  // Cap combined saved + recent to 3 on Home; the rest live behind "View all".
  const recentRows = recents.filter(
    (r) => !saved.some((s) => s.originId === r.originId && s.destinationId === r.destinationId),
  );
  const savedShown = savedSummaries.slice(0, 3);
  const recentShown = recentRows.slice(0, Math.max(0, 3 - savedShown.length));
  const totalJourneys = savedSummaries.length + recentRows.length;

  const relevantStations = useMemo(() => {
    const ids = new Set<string>();
    for (const s of saved) ids.add(s.originId);
    for (const r of recents) ids.add(r.originId);
    if (ids.size === 0) ids.add(DEMO_ORIGIN_ID);
    return ids;
  }, [saved, recents]);
  const nearby = nearbyServices.filter((n) => relevantStations.has(n.stationId)).slice(0, 4);
  const nearbyList = nearby.length > 0 ? nearby : nearbyServices.slice(0, 3);

  const conditions = [...pulse.entries()]
    .filter(([, d]) => d.summary.reportCount > 0 && d.summary.condition !== "Normal")
    .sort((a, b) => severityRank(b[1]) - severityRank(a[1]))
    .slice(0, 3);

  return (
    <div className="lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(440px,40%)_1fr]">
      <div className="hidden lg:col-start-2 lg:row-start-1 lg:block">
        <TransitMap
          label="Network map with current station conditions"
          disruptions={disruptions}
          pulse={pulse}
          scenarioServices={active}
          onStationClick={openStation}
        />
      </div>

      <div className="lg:col-start-1 lg:row-start-1 lg:overflow-y-auto lg:border-r lg:border-border">
        <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 pb-8 pt-5 sm:px-6 lg:max-w-none lg:px-7 lg:pt-7">
          {/* Mobile brand row */}
          <div className="flex items-center justify-between lg:hidden">
            <span className="flex items-center gap-2">
              <Ger4kMark className="size-8" />
              <span className="text-[20px] font-extrabold tracking-tight text-foreground">GER4K</span>
            </span>
            <Link
              href="/profile"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-surface px-3 text-caption font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
              aria-label={`${points.total} GER4K Points. Open profile`}
            >
              <Trophy className="size-4 text-violet" aria-hidden="true" />
              {points.total}
            </Link>
          </div>

          {alerts[0] ? <ProactiveAlertCard alert={alerts[0]} /> : null}

          {/* 1 — Journey search (dominant) */}
          <section aria-labelledby="where-heading" className="flex flex-col gap-4">
            <h1 id="where-heading" className="text-[32px] font-bold leading-[1.08] tracking-tight text-foreground sm:text-display">
              Where are you going?
            </h1>
            {hydrated ? (
              <JourneySearch key={`${initialOrigin}-${initialDestination}`} initialOrigin={initialOrigin} initialDestination={initialDestination} />
            ) : (
              <div className="h-[268px] animate-pulse rounded-2xl bg-surface" aria-hidden="true" />
            )}
          </section>

          {/* 2 — Saved / recent (capped) */}
          <section aria-labelledby="saved-heading" className="flex flex-col gap-3">
            <SectionHeader
              id="saved-heading"
              title="Your journeys"
              href={totalJourneys > 3 ? "/profile" : undefined}
              linkLabel="View all"
            />
            {savedShown.length === 0 && recentShown.length === 0 ? (
              <Link
                href={journeyHref(DEMO_ORIGIN_ID, DEMO_DESTINATION_ID)}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-3 hover:bg-navy-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
              >
                <Star className="size-5 text-foreground-subtle" aria-hidden="true" />
                <span className="flex flex-col">
                  <span className="text-body font-semibold text-foreground">Try Putrajaya Sentral → KLCC</span>
                  <span className="text-caption text-foreground-muted">Save it as &ldquo;Work&rdquo; and GER4K will watch it for you</span>
                </span>
              </Link>
            ) : (
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
                {savedShown.map(({ s, usual, fare, alert }) => (
                  <li key={s.id}>
                    <Link
                      href={journeyHref(s.originId, s.destinationId)}
                      className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-navy-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet"
                    >
                      <Star className="size-5 shrink-0 fill-violet text-violet" aria-hidden="true" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-body font-semibold text-foreground">{s.label}</span>
                        <span className="truncate text-caption text-foreground-muted">
                          {stationName(s.originId)} → {stationName(s.destinationId)}
                        </span>
                      </span>
                      {alert ? (
                        <span className="rounded-full bg-critical/10 px-2.5 py-1 text-caption font-bold text-critical">Disrupted</span>
                      ) : usual ? (
                        <span className="text-right text-caption text-foreground-muted">
                          <span className="block text-body font-semibold text-foreground">{usual.totalTimeMin} min</span>
                          {fare !== null ? formatRm(fare) : ""}
                        </span>
                      ) : null}
                      <ChevronRight className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
                {recentShown.map((r) => (
                  <li key={`${r.originId}-${r.destinationId}`}>
                    <Link
                      href={journeyHref(r.originId, r.destinationId)}
                      className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-navy-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet"
                    >
                      <Clock className="size-5 shrink-0 text-foreground-subtle" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-body text-foreground">
                        {stationName(r.originId)} → {stationName(r.destinationId)}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 3 — Nearby / relevant transport (bus + feeder made visible) */}
          <section aria-labelledby="nearby-heading" className="flex flex-col gap-3">
            <SectionHeader id="nearby-heading" title="Nearby transport" />
            <div className="flex flex-col gap-2">
              {nearbyList.map((n) => (
                <BusArrivalCard
                  key={n.id}
                  code={n.code}
                  kind={n.kind === "feeder" ? `MRT feeder · ${stationName(n.stationId)}` : `Rapid KL bus · ${stationName(n.stationId)}`}
                  headsign={n.headsign}
                  arrivalMin={now === null ? null : simulatedNextArrivalMin(n.id, n.simulatedHeadwayMin, now)}
                  lineId={n.kind === "bus" ? "rapidkl-bus-300" : undefined}
                />
              ))}
            </div>
            <p className="text-caption text-foreground-subtle">Route numbers and names from official Rapid KL GTFS. Countdown times are simulated.</p>
          </section>

          {/* 4 — Service status */}
          <section aria-labelledby="service-heading" className="flex flex-col gap-3">
            <SectionHeader id="service-heading" title="Service status" href="/service" linkLabel="All lines" />
            <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
              {statuses.map((s) => (
                <li key={s.lineId}>
                  <ServiceStatusRow status={s} stationName={stationName} showCommunity={false} href={`/service/${s.lineId}`} />
                </li>
              ))}
            </ul>
            <p className="text-caption text-foreground-subtle">
              Demo status feed — not a live operator feed.
              {active ? " The disruption shown is a simulated demo scenario." : ""}
            </p>
          </section>

          {/* 5 — Station Pulse snapshot */}
          {conditions.length > 0 ? (
            <section aria-labelledby="pulse-heading" className="flex flex-col gap-3">
              <SectionHeader id="pulse-heading" title="Station Pulse" href="/pulse" linkLabel="View Station Pulse" />
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {conditions.map(([id, d]) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => openStation(id)}
                      className={cn(
                        "flex w-full min-h-16 flex-col items-start gap-1 rounded-2xl border border-border bg-surface px-4 py-3 text-left",
                        "hover:bg-navy-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet",
                      )}
                    >
                      <span className="text-body font-semibold text-foreground">{stationName(id)}</span>
                      <ConditionPill condition={d.summary.condition} />
                      <span className="text-caption text-foreground-muted">{d.summary.reportCount} reports</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-caption text-foreground-subtle">Community reports, including seeded demo reports.</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
