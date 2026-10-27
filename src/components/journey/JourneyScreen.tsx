"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, MapPinOff, Sparkles } from "lucide-react";

import { demoStations, DEMO_DESTINATION_ID, DEMO_ORIGIN_ID } from "@/data";
import { buildCopilotRequest } from "@/services/ai/buildCopilotRequest";
import { deriveDisruptionSummary } from "./disruptionSummary";
import type { JourneyOption, PreferenceProfile } from "@/types";
import { cn } from "@/components/ui";
import { TransitMap } from "@/components/map/TransitMap";
import { useDemoScenario } from "@/components/demo";
import { useGer4kStore } from "@/components/state/Ger4kStore";
import { stationName } from "@/components/state/useLiveData";
import { RouteSequence, HonestyChip } from "@/components/transit/TransitBits";
import { lineInfoFor } from "@/components/transit/lineStyle";

import { useJourneyPlan } from "./useJourneyPlan";
import { useJourneyContextBridge } from "@/services/gerak-khas/context/useJourneyContextBridge";
import { useGerakKhas } from "@/components/gerak-khas";
import {
  JourneyChangedBanner,
  optionIsBus,
  ProfileChips,
  profileLabel,
  RideHailRow,
  RouteHero,
  RouteOptionRow,
} from "./RouteCards";
import { FareBreakdown, RouteSteps } from "./RouteSteps";
import { SaveJourneyButton } from "./SaveJourneyButton";
import { WhyRecommendationSheet } from "./WhyRecommendationSheet";

/**
 * JourneyScreen — journey results that transition IN PLACE into recovery mode
 * (Requirements 21, 22). Map + bottom sheet on mobile; 38/62 split on desktop.
 * All intelligence comes from the domain via `useJourneyPlan`.
 */

function validStation(id: string | null, fallback: string): string {
  return id && demoStations.some((s) => s.id === id) ? id : fallback;
}

function baseDepartMs(when: string | null, time: string | null, totalMin: number, now: number): number {
  if (!when || when === "now" || !time || !/^\d{2}:\d{2}$/.test(time)) return now;
  const [h, m] = time.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return when === "arrive" ? d.getTime() - totalMin * 60_000 : d.getTime();
}

export default function JourneyScreen() {
  const params = useSearchParams();
  const originId = validStation(params.get("from"), DEMO_ORIGIN_ID);
  const destinationId = validStation(params.get("to"), DEMO_DESTINATION_ID);
  const when = params.get("when");
  const time = params.get("time");

  const { defaultProfile, hydrated, openStation, mobilityNeeds } = useGer4kStore();
  const { active } = useDemoScenario();
  const [profile, setProfile] = useState<PreferenceProfile>("Balanced");
  const [profileTouched, setProfileTouched] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rideHailPreview, setRideHailPreview] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  // "Why this recommendation?" explanation sheet (reuses preserved logic).
  const [whyOpen, setWhyOpen] = useState(false);

  // Default ranking profile comes from the passenger's saved preferences.
  useEffect(() => {
    if (hydrated && !profileTouched) setProfile(defaultProfile);
  }, [hydrated, defaultProfile, profileTouched]);

  const plan = useJourneyPlan(originId, destinationId, profile);
  const { result, recovery, pulse, usual, impact } = plan;

  // A scenario change re-plans: reset selection.
  useEffect(() => {
    setSelectedId(null);
    setRideHailPreview(false);
  }, [recovery, originId, destinationId]);

  const hero = result.options[0] ?? null;
  const selected: JourneyOption | null = useMemo(() => {
    if (!selectedId) return hero;
    return result.options.find((o) => o.id === selectedId) ?? result.candidates.find((o) => o.id === selectedId) ?? hero;
  }, [selectedId, result, hero]);
  const selectedIsExtra = !!selected && !result.options.some((o) => o.id === selected.id);

  // Publish the minimal current-journey context to Gerak Khas (global co-pilot).
  useJourneyContextBridge(originId, destinationId, plan, selected?.id ?? null, mobilityNeeds);

  // Consume Gerak Khas route-selection requests (SELECT_ROUTE / SHOW_BUS).
  const { routeRequest, consumeRouteRequest } = useGerakKhas();
  useEffect(() => {
    if (!routeRequest) return;
    const valid =
      result.options.some((o) => o.id === routeRequest.routeId) ||
      result.candidates.some((o) => o.id === routeRequest.routeId);
    if (valid) {
      if (routeRequest.profile) {
        setProfile(routeRequest.profile);
        setProfileTouched(true);
      }
      setSelectedId(routeRequest.routeId);
      setRideHailPreview(false);
    }
    consumeRouteRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeRequest]);
  const others = result.options.filter((o) => o.id !== hero?.id);

  const now = plan.ready ? plan.now : null;
  const departMs = now !== null && selected ? baseDepartMs(when, time, selected.journey.totalTimeMin, now) : null;
  const heroDepartMs = now !== null && hero ? baseDepartMs(when, time, hero.journey.totalTimeMin, now) : null;

  // "Why this recommendation?" reuses the PRESERVED explanation pipeline
  // (buildCopilotRequest + /api/ask + answerAsk fallback) for the recommended
  // option only. The full Ask GER4K co-pilot UI is removed for now.
  const disruptionSummary = deriveDisruptionSummary(plan.affecting, stationName);
  const whyRequest = useMemo(
    () =>
      hero
        ? buildCopilotRequest({
            result,
            question: recovery ? "Why this route?" : "Why this recommendation?",
            focusedOptionId: hero.id,
            stations: plan.stations,
            disruptionSummary,
            destinationName: stationName(destinationId),
          })
        : null,
    [hero, result, recovery, plan.stations, disruptionSummary, destinationId],
  );

  const mapLabel = `Map of ${stationName(originId)} to ${stationName(destinationId)}${selected ? `, showing ${selected.title}` : ""}${recovery ? ", with the disrupted section marked" : ""}.`;

  return (
    <div className="lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(440px,40%)_1fr]">
      {/* Map: sticky on mobile (sheet scrolls over it); right panel on desktop. */}
      <div className="sticky top-0 z-0 h-[42dvh] min-h-[280px] lg:static lg:col-start-2 lg:row-start-1 lg:h-full">
        <TransitMap
          label={mapLabel}
          selected={rideHailPreview ? null : selected?.journey ?? null}
          others={rideHailPreview ? [] : others.filter((o) => o.id !== selected?.id).map((o) => o.journey)}
          disruptions={plan.disruptions}
          pulse={pulse}
          scenarioServices={active}
          rideHail={rideHailPreview && result.rideHail ? result.rideHail : null}
          onStationClick={openStation}
        />
        <Link
          href="/"
          className="absolute left-3 top-3 inline-flex h-11 items-center gap-2 rounded-full bg-surface/95 px-4 text-caption font-semibold text-foreground shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet lg:hidden"
        >
          <ArrowLeft className="size-4.5" aria-hidden="true" />
          {stationName(originId)} → {stationName(destinationId)}
        </Link>
      </div>

      {/* Panel / bottom sheet */}
      <div className="relative z-10 -mt-6 min-h-[60dvh] rounded-t-3xl bg-navy pb-6 shadow-[0_-8px_30px_rgba(17,24,39,0.10)] lg:col-start-1 lg:row-start-1 lg:mt-0 lg:min-h-0 lg:overflow-y-auto lg:rounded-none lg:border-r lg:border-border lg:shadow-none">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-navy-700 lg:hidden" aria-hidden="true" />
        <div className="flex flex-col gap-5 px-4 pt-4 sm:px-6 lg:px-7 lg:pt-6">
          {/* Summary header */}
          <header className="flex flex-col gap-3">
            <Link
              href="/"
              className="hidden w-fit items-center gap-1.5 rounded-lg text-caption font-semibold text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet lg:inline-flex"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Change search
            </Link>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-heading font-bold leading-tight tracking-tight text-foreground">
                  {stationName(originId)} <span className="text-foreground-subtle">→</span> {stationName(destinationId)}
                </h1>
                <p className="text-body text-foreground-muted">
                  {when === "arrive" && time ? `Arrive by ${time}` : when === "depart" && time ? `Depart at ${time}` : "Depart now"}
                  {hero ? ` · ${result.options.length} option${result.options.length === 1 ? "" : "s"}` : ""}
                </p>
              </div>
              <SaveJourneyButton originId={originId} destinationId={destinationId} />
            </div>
          </header>

          {recovery ? <JourneyChangedBanner disruptions={plan.affecting} /> : null}

          {!hero ? (
            <div className="flex items-start gap-3 rounded-2xl bg-surface px-5 py-5" role="status">
              <MapPinOff className="mt-0.5 size-6 shrink-0 text-foreground-subtle" aria-hidden="true" />
              <div>
                <p className="text-title font-semibold text-foreground">
                  {recovery ? "No alternative route found" : "No route found"}
                </p>
                <p className="text-body text-foreground-muted">
                  GER4K couldn&rsquo;t build a route between these stations. Try a different origin or destination.
                </p>
              </div>
            </div>
          ) : (
            <>
              <section aria-labelledby="recommend-heading" className="flex flex-col gap-3">
                <h2 id="recommend-heading" className="flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-violet">
                  <Sparkles className="size-4" aria-hidden="true" />
                  {recovery ? "GER4K recommends" : "Best for you"}
                  {profile !== "Balanced" ? <span className="font-semibold normal-case tracking-normal text-foreground-muted">· {profileLabel(profile)}</span> : null}
                </h2>
                <RouteHero
                  key={`${hero.id}-${profile}`}
                  option={hero}
                  recovery={recovery}
                  pulse={pulse}
                  departMs={heroDepartMs}
                  selected={selected?.id === hero.id && !rideHailPreview}
                  onSelect={() => {
                    setSelectedId(null);
                    setRideHailPreview(false);
                  }}
                  onWhy={() => setWhyOpen(true)}
                  onStation={openStation}
                />
              </section>

              <section aria-labelledby="matters-heading" className="flex flex-col gap-2.5">
                <h2 id="matters-heading" className="text-title font-semibold text-foreground">What matters most?</h2>
                <ProfileChips
                  value={profile}
                  onChange={(p) => {
                    setProfile(p);
                    setProfileTouched(true);
                    setSelectedId(null);
                    setRideHailPreview(false);
                  }}
                />
              </section>

              {others.length > 0 || result.rideHail || selectedIsExtra ? (
                <section aria-labelledby="others-heading" className="flex flex-col gap-2.5">
                  <h2 id="others-heading" className="text-title font-semibold text-foreground">
                    {recovery ? "Other ways to recover" : "Other ways"}
                  </h2>
                  {others.map((o) => (
                    <RouteOptionRow
                      key={o.id}
                      option={o}
                      selected={selected?.id === o.id && !rideHailPreview}
                      label={optionIsBus(o) ? "Bus option" : undefined}
                      onSelect={() => {
                        setSelectedId(o.id);
                        setRideHailPreview(false);
                      }}
                    />
                  ))}
                  {selectedIsExtra && selected ? (
                    <RouteOptionRow option={selected} selected label="Your choice" onSelect={() => setRideHailPreview(false)} />
                  ) : null}
                  {result.rideHail ? (
                    <RideHailRow
                      estimate={result.rideHail}
                      selected={rideHailPreview}
                      onSelect={() => setRideHailPreview((v) => !v)}
                    />
                  ) : null}
                </section>
              ) : null}

              {/* Details of the selected option */}
              {selected && !rideHailPreview ? (
                <section aria-labelledby="details-heading" className="flex flex-col gap-4 rounded-3xl bg-surface px-5 py-5">
                  <h2 id="details-heading" className="text-title font-semibold text-foreground">
                    Steps · {selected.title}
                  </h2>
                  <RouteSteps option={selected} pulse={pulse} onStation={openStation} departMs={departMs} />
                  <details className="group rounded-2xl border border-border px-4 py-3">
                    <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-body font-semibold text-foreground">
                      Fare & sources
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="mt-3 flex flex-col gap-4">
                      <FareBreakdown option={selected} />
                      <p className="text-caption text-foreground-muted">
                        Rail times are scheduled estimates (not live). Bus 300 timing from official GTFS Static; arrival countdowns are simulated.
                        Station conditions are community reports.
                        {selected.isSimulated ? " The replacement bus is a simulated scenario service." : ""}
                      </p>
                    </div>
                  </details>
                </section>
              ) : null}

              {recovery && usual && impact ? (
                <section className="flex flex-col gap-2">
                  <button
                    type="button"
                    aria-expanded={showOriginal}
                    onClick={() => setShowOriginal((v) => !v)}
                    className="flex min-h-11 items-center justify-between rounded-2xl bg-surface px-4 text-body font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                  >
                    Your original route
                    <ChevronDown className={cn("size-4 transition-transform", showOriginal && "rotate-180")} aria-hidden="true" />
                  </button>
                  {showOriginal ? (
                    <div className="flex flex-col gap-2 rounded-2xl bg-surface px-4 py-4">
                      <RouteSequence legs={usual.legs} stationName={stationName} />
                      <p className="text-body text-foreground-muted">
                        {usual.totalTimeMin} min on a normal day. The{" "}
                        {impact.affectedLegIndexes.map((i) => lineInfoFor(usual.legs[i].line)?.name ?? usual.legs[i].line).join(", ")} leg runs through the
                        disrupted section{plan.affecting[0] ? ` between ${stationName(plan.affecting[0].affectedSegment.from)} and ${stationName(plan.affecting[0].affectedSegment.to)}` : ""}.
                      </p>
                      <HonestyChip tone="simulated" className="self-start">Simulated demo scenario</HonestyChip>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>

      <WhyRecommendationSheet
        open={whyOpen}
        onClose={() => setWhyOpen(false)}
        title={hero?.title ?? "This route"}
        request={whyRequest}
      />
    </div>
  );
}



