"use client";

import { useState } from "react";
import { CircleCheck, Trophy } from "lucide-react";

import { REPORT_TYPE_GROUPS, contributorLevel } from "@/domain/community";
import type { StationReportType } from "@/types";
import { Button, cn } from "@/components/ui";
import { useGer4kStore } from "@/components/state/Ger4kStore";

/**
 * QuickReport — one-or-two-tap structured reporting (Requirement 25).
 * Only structured types; no free text. A new report is stored UNVERIFIED and
 * not simulated; GER4K never claims it is verified.
 */
export function QuickReport({
  stationId,
  stationName,
  onDone,
}: {
  stationId: string;
  stationName: string;
  onDone?: () => void;
}) {
  const { submitReport, points } = useGer4kStore();
  const [choice, setChoice] = useState<StationReportType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ awarded: number; duplicate: boolean } | null>(null);

  if (result) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-success/10 px-4 py-4" role="status" aria-live="polite">
        <div className="flex items-start gap-3">
          <CircleCheck className="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-body font-semibold text-foreground">Thanks for helping other commuters</p>
            {result.awarded > 0 ? (
              <p className="flex items-center gap-1.5 text-title font-bold text-violet animate-[riseIn_200ms_ease-out]">
                <Trophy className="size-5" aria-hidden="true" />+{result.awarded} GER4K Points
              </p>
            ) : (
              <p className="text-caption text-foreground-muted">
                You already reported this here a moment ago, so no extra points this time.
              </p>
            )}
            <p className="text-caption text-foreground-muted">
              {points.total} points · {contributorLevel(points.acceptedReports)}. Your report shows as
              &ldquo;Just reported · unverified&rdquo;.
            </p>
          </div>
        </div>
        {onDone ? (
          <Button variant="secondary" size="sm" onClick={onDone} className="self-start">
            Done
          </Button>
        ) : null}
      </div>
    );
  }

  function submit() {
    const r = submitReport(stationId, choice);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setError(null);
    setResult({ awarded: r.awarded, duplicate: r.duplicate });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-title font-semibold text-foreground">How is {stationName} right now?</p>
      {REPORT_TYPE_GROUPS.map((g) => (
        <fieldset key={g.group} className="flex flex-col gap-2">
          <legend className="mb-1 text-caption font-semibold text-foreground-muted">{g.group}</legend>
          <div className={cn("grid gap-2", g.group === "Crowding" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3")}>
            {g.types.map((t) => {
              const selected = choice === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setChoice(t);
                    setError(null);
                  }}
                  className={cn(
                    "min-h-12 rounded-xl border px-3 py-2 text-left text-body font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet",
                    selected
                      ? "border-violet bg-violet text-white"
                      : "border-border bg-surface text-foreground hover:bg-navy-800",
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {error ? (
        <p className="text-caption font-semibold text-critical" role="alert">
          {error}
        </p>
      ) : null}
      <Button size="lg" fullWidth onClick={submit}>
        Submit report
      </Button>
      <p className="text-caption text-foreground-muted">
        Reports are anonymous on this device and start as unverified. +5 GER4K Points per report.
      </p>
    </div>
  );
}

export default QuickReport;
