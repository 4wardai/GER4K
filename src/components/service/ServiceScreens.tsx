"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, Bus, ChevronRight, Info, Sparkles, Users } from "lucide-react";

import { demoStations, historicalDemandDataset, lineInfo, mockDataProvider } from "@/data";
import { historicalDemandFor } from "@/domain/demand";
import { isNoRouteFound, planJourneyOnNetwork } from "@/domain/transport";
import { evaluateImpact } from "@/domain/disruption";
import { buildJourneyOptions } from "@/domain/options";
import { cn } from "@/components/ui";
import { useDemoScenario } from "@/components/demo";
import { useGer4kStore } from "@/components/state/Ger4kStore";
import { stationName, useActiveDisruptions, useNow, useStationPulse } from "@/components/state/useLiveData";
import { ConditionPill, HonestyChip, trendText } from "@/components/transit/TransitBits";
import { formatRm, lineInfoFor } from "@/components/transit/lineStyle";
import { journeyHref } from "@/components/alerts/alerts";
import { freshnessText, reportsText } from "@/components/pulse/pulseCopy";

import { ServiceStatusRow } from "@/components/transit/ServiceStatusRow";
import { useLineStatuses } from "./useLineStatuses";

/** Service — line list (Requirement 26.1, 26.4). */
export function ServiceScreen() {
  const statuses = useLineStatuses();
  const { active } = useDemoScenario();
  const buses = lineInfo.filter((l) => l.kind !== "rail" && (l.kind === "bus" || active));

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-heading font-bold tracking-tight text-foreground sm:text-display">Service</h1>
        <p className="max-w-2xl text-body text-foreground-muted">
          Line status, what commuters are seeing, and what it means for your journeys.
        </p>
      </header>

      <section aria-labelledby="rail-heading" className="flex flex-col gap-3">
        <h2 id="rail-heading" className="text-title font-semibold text-foreground">Rail lines</h2>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
          {statuses.map((s) => (
            <li key={s.lineId}>
              <ServiceStatusRow status={s} stationName={stationName} href={`/service/${s.lineId}`} />
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-2 text-caption text-foreground-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Line status comes from GER4K&rsquo;s demo status feed; no live operator feed is connected in this prototype.
          {active ? " The current disruption is a simulated demo scenario and is unverified." : ""}
        </p>
      </section>

      <section aria-labelledby="bus-heading" className="flex flex-col gap-3">
        <h2 id="bus-heading" className="text-title font-semibold text-foreground">Bus services</h2>
        <ul className="flex flex-col gap-2">
          {buses.map((b) => (
            <li key={b.lineId} className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
              <span className="flex h-9 min-w-[3.25rem] items-center justify-center gap-1 rounded-lg px-2 text-body font-extrabold" style={{ backgroundColor: b.colour, color: b.textColour }}>
                <Bus className="size-4" aria-hidden="true" />
                {b.code}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body font-semibold text-foreground">{b.name}</span>
                <span className="truncate text-caption text-foreground-muted">
                  {b.description} · {b.headwayText}
                </span>
              </span>
              {b.isSimulated ? <HonestyChip tone="simulated">Simulated</HonestyChip> : <HonestyChip>Scheduled</HonestyChip>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Line detail — Service notice → Community → GER4K for your journey (Requirement 26.2). */
export function LineDetailScreen({ lineId }: { lineId: string }) {
  const info = lineInfoFor(lineId);
  const statuses = useLineStatuses();
  const status = statuses.find((s) => s.lineId === lineId);
  const { pulse } = useStationPulse();
  const now = useNow(30_000);
  const { openStation, saved, recents } = useGer4kStore();
  const disruptions = useActiveDisruptions();
  const { active } = useDemoScenario();

  const network = mockDataProvider.getNetwork();
  const line = network.lines.find((l) => l.id === lineId);

  // GER4K decision support: the passenger's journeys that use this line.
  const personal = useMemo(() => {
    if (!info) return [];
    const trips = [
      ...saved.map((s) => ({ label: s.label, o: s.originId, d: s.destinationId })),
      ...recents.map((r) => ({ label: "Recent", o: r.originId, d: r.destinationId })),
    ].filter((t, i, arr) => arr.findIndex((x) => x.o === t.o && x.d === t.d) === i);
    const out: Array<{ label: string; o: string; d: string; affected: boolean; best?: { title: string; time: number; fare: number } }> = [];
    for (const t of trips) {
      const plan = planJourneyOnNetwork(network, t.o, t.d);
      if (isNoRouteFound(plan)) continue;
      if (!plan.journey.legs.some((l) => l.line === info.name)) continue;
      const affected = evaluateImpact(plan.journey, disruptions, network).affected;
      let best: { title: string; time: number; fare: number } | undefined;
      if (affected) {
        const res = buildJourneyOptions({
          network: mockDataProvider.getMultimodalNetwork({ includeScenarioServices: active }),
          coreNetwork: network,
          originId: t.o,
          destinationId: t.d,
          disruptions,
          isRecovery: true,
          pulseByStation: pulse,
          fareRules: mockDataProvider.getFareRules(),
          profile: "Balanced",
          stationName,
        });
        const top = res.options[0];
        if (top) best = { title: top.title, time: top.journey.totalTimeMin, fare: top.fare.totalSen };
      }
      out.push({ ...t, affected, best });
    }
    return out.slice(0, 3);
  }, [info, saved, recents, network, disruptions, active, pulse]);

  if (!info || !line) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/service" className="text-caption font-semibold text-violet">← Service</Link>
        <p className="text-body text-foreground-muted">That line isn&rsquo;t in GER4K&rsquo;s prototype network.</p>
      </div>
    );
  }

  const disrupted = status?.status === "Disrupted";
  const lineStations = info.realOrder.filter((id) => line.stationIds.includes(id));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/service" className="inline-flex w-fit items-center gap-1.5 rounded-lg text-caption font-semibold text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Service
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        <span className="flex h-12 min-w-16 items-center justify-center rounded-xl px-3 text-title font-extrabold" style={{ backgroundColor: info.colour, color: info.textColour }}>
          {info.code}
        </span>
        <div className="min-w-0">
          <h1 className="text-heading font-bold tracking-tight text-foreground">{info.name}</h1>
          <p className="text-body text-foreground-muted">{info.mode} · {info.description} · {info.operator}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 1. Service notice */}
        <section aria-labelledby="notice-heading" className={cn("flex flex-col gap-2 rounded-3xl border bg-surface px-5 py-5", disrupted ? "border-critical/30" : "border-border")}>
          <h2 id="notice-heading" className="text-caption font-bold uppercase tracking-wider text-foreground-muted">Service notice</h2>
          <p className={cn("text-title font-bold", disrupted ? "text-critical" : "text-success")}>{disrupted ? "Disrupted" : "Running normally"}</p>
          <p className="text-body text-foreground">
            {disrupted && status?.notice ? `${status.notice}. Trains are not running on this section.` : "No disruption in GER4K's status feed."}
          </p>
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {status?.isSimulated ? <HonestyChip tone="simulated">{disrupted ? "Simulated demo" : "Demo status"}</HonestyChip> : null}
            {disrupted && status?.sourceStatus === "UNVERIFIED" ? <HonestyChip>Unverified</HonestyChip> : null}
          </div>
        </section>

        {/* 2. Community */}
        <section aria-labelledby="community-heading" className="flex flex-col gap-3 rounded-3xl border border-border bg-surface px-5 py-5">
          <h2 id="community-heading" className="flex items-center gap-1.5 text-caption font-bold uppercase tracking-wider text-foreground-muted">
            <Users className="size-4" aria-hidden="true" />
            Community
          </h2>
          <ul className="flex flex-col gap-1">
            {lineStations
              .map((id) => ({ id, d: pulse.get(id) }))
              .filter((x) => x.d && x.d.summary.reportCount > 0)
              .map(({ id, d }) => (
                <li key={id}>
                  <button type="button" onClick={() => openStation(id)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-2 text-left hover:bg-navy-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet">
                    <span className="flex flex-col">
                      <span className="text-body font-semibold text-foreground">{stationName(id)}</span>
                      <span className="text-caption text-foreground-muted">
                        {reportsText(d!.summary.reportCount)} · {freshnessText(d!.summary.mostRecentAt, now)}
                        {trendText(d!.trend) ? ` · ${trendText(d!.trend)}` : ""}
                      </span>
                    </span>
                    <ConditionPill condition={d!.summary.condition} size="sm" />
                  </button>
                </li>
              ))}
          </ul>
          {lineStations.every((id) => !pulse.get(id)?.summary.reportCount) ? (
            <p className="text-body text-foreground-muted">No recent community reports on this line.</p>
          ) : null}
        </section>

        {/* 3. GER4K for your journey */}
        <section aria-labelledby="ger4k-heading" className="flex flex-col gap-3 rounded-3xl border border-violet/25 bg-violet/[0.04] px-5 py-5">
          <h2 id="ger4k-heading" className="flex items-center gap-1.5 text-caption font-bold uppercase tracking-wider text-violet">
            <Sparkles className="size-4" aria-hidden="true" />
            GER4K for you
          </h2>
          {personal.length === 0 ? (
            <p className="text-body text-foreground-muted">Save or search a journey that uses the {info.name} to get personal advice here.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {personal.map((p) => (
                <li key={`${p.o}-${p.d}`}>
                  <Link href={journeyHref(p.o, p.d)} className="flex flex-col gap-1 rounded-2xl bg-surface px-4 py-3 hover:bg-navy-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet">
                    <span className="text-caption font-semibold text-foreground-muted">{p.label} · {stationName(p.o)} → {stationName(p.d)}</span>
                    {p.affected ? (
                      <>
                        <span className="text-body font-semibold text-critical">Your journey is affected.</span>
                        {p.best ? (
                          <span className="text-body text-foreground">
                            Best recovery: <span className="font-semibold">{p.best.title}</span> · {p.best.time} min · {formatRm(p.best.fare)}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-body text-foreground">Your usual route on this line looks fine.</span>
                    )}
                    <span className="inline-flex items-center gap-1 text-caption font-semibold text-violet">
                      {p.affected ? "View recovery" : "View journey"}
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="stations-heading" className="flex flex-col gap-3">
        <h2 id="stations-heading" className="text-title font-semibold text-foreground">Stations in GER4K</h2>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {lineStations.map((id) => {
            const st = demoStations.find((s) => s.id === id);
            const hd = historicalDemandFor(historicalDemandDataset, id);
            const affected = status?.affectedStationIds.includes(id);
            return (
              <li key={id}>
                <button type="button" onClick={() => openStation(id)} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-navy-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body font-semibold text-foreground">{st?.name ?? id}</span>
                    <span className="text-caption text-foreground-muted">{(st?.codes ?? []).join(" · ")}</span>
                  </span>
                  {affected ? <span className="rounded-full bg-critical/10 px-2.5 py-1 text-caption font-bold text-critical">Affected</span> : null}
                  {hd ? <span className="text-caption text-foreground-muted">Historical demand: <span className="font-semibold text-foreground">{hd.band}</span></span> : null}
                  <ChevronRight className="size-4 text-foreground-subtle" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-[12px] text-foreground-subtle">
          Historical demand: weekday tap-in + tap-out trips, data.gov.my Rapid Rail OD ridership ({historicalDemandDataset.window[0]} to {historicalDemandDataset.window[1]}). Not live crowding.
        </p>
      </section>
    </div>
  );
}
