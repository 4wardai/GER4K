"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BellRing, ChevronRight, X } from "lucide-react";

import { mockDataProvider } from "@/data";
import { evaluateSavedJourneyAlerts } from "@/domain/personal";
import type { SavedJourneyAlert } from "@/types";
import { cn } from "@/components/ui";
import { useDemoScenario } from "@/components/demo";
import { useGer4kStore } from "@/components/state/Ger4kStore";
import { stationName, useActiveDisruptions } from "@/components/state/useLiveData";
import { HonestyChip } from "@/components/transit/TransitBits";

/**
 * Proactive saved-journey alerts (Requirement 29) — local, simulated prototype
 * alerts computed with the CORE planner + Disruption_Monitor. No push
 * infrastructure.
 */

export function useSavedJourneyAlerts(): SavedJourneyAlert[] {
  const { saved } = useGer4kStore();
  const disruptions = useActiveDisruptions();
  return useMemo(
    () => evaluateSavedJourneyAlerts(saved, mockDataProvider.getNetwork(), disruptions),
    [saved, disruptions],
  );
}

export function journeyHref(originId: string, destinationId: string): string {
  return `/journey?from=${encodeURIComponent(originId)}&to=${encodeURIComponent(destinationId)}`;
}

/** The prominent Home alert card. */
export function ProactiveAlertCard({ alert, className }: { alert: SavedJourneyAlert; className?: string }) {
  return (
    <section
      aria-label="Saved journey alert"
      className={cn("overflow-hidden rounded-3xl border border-critical/25 bg-surface shadow-sm", className)}
    >
      <div className="flex items-start gap-3 bg-critical/[0.07] px-5 py-4">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-critical text-white">
          <BellRing className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-title font-bold text-foreground">Your usual journey may be disrupted</p>
          <p className="text-body font-semibold text-foreground">
            {alert.label} · {stationName(alert.originId)} → {stationName(alert.destinationId)}
          </p>
          <p className="text-body text-foreground-muted">
            Service interruption on the {alert.lineName} between {stationName(alert.affectedFrom)} and{" "}
            {stationName(alert.affectedTo)}. GER4K has prepared alternatives.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <Link
          href={journeyHref(alert.originId, alert.destinationId)}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-critical px-5 text-body font-semibold text-white shadow-sm hover:bg-[#dc2626] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-critical focus-visible:ring-offset-2"
        >
          View recovery
          <ChevronRight className="size-5" aria-hidden="true" />
        </Link>
        <HonestyChip tone="simulated">{alert.isSimulated ? "Simulated demo · prototype alert" : "Prototype alert"}</HonestyChip>
      </div>
    </section>
  );
}

/**
 * Prototype "push-like" banner shown across screens when the scenario starts
 * and a saved journey is affected. Dismissible; reappears after a reset.
 */
export function PrototypeAlertBanner() {
  const alerts = useSavedJourneyAlerts();
  const { active } = useDemoScenario();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!active) setDismissed(false);
  }, [active]);

  const alert = alerts[0];
  if (!alert || dismissed) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[55] flex justify-center px-3 lg:top-[4.5rem]">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-[0_12px_32px_rgba(17,24,39,0.18)] animate-[sheetUp_240ms_cubic-bezier(0.22,1,0.36,1)]"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-critical text-white">
          <BellRing className="size-4.5" aria-hidden="true" />
        </span>
        <Link href={journeyHref(alert.originId, alert.destinationId)} className="min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet" onClick={() => setDismissed(true)}>
          <span className="block text-caption font-semibold text-foreground-muted">GER4K · prototype alert</span>
          <span className="block truncate text-body font-semibold text-foreground">
            {alert.label}: your journey may be disrupted
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss alert"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foreground-muted hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
