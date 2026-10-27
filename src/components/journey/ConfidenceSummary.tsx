"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { bandLabel, bandMeaning, describeFactors } from "@/domain/confidence";
import type { JourneyConfidence } from "@/types";
import { cn } from "@/components/ui";
import { useGer4kStore } from "@/components/state/Ger4kStore";

/**
 * ConfidenceSummary (Requirement 32) — a compact confidence METER.
 *
 * The passenger sees a labelled bar coloured by band (Low red / Medium amber /
 * High green), the score and band in text (for accessibility), and one concise
 * human reason. A quiet "Why this confidence?" expands the existing detailed
 * factor list; the raw numeric deltas stay behind presenter/dev mode.
 *
 * The confidence SCORE and bands are computed by the domain and passed in
 * unchanged — this component only presents them.
 */

/** Band → meter fill colour + the matching track tint. */
const BAND_STYLE = {
  High: { fill: "bg-success", tint: "bg-success/15", text: "text-success" },
  Medium: { fill: "bg-warning", tint: "bg-warning/20", text: "text-[#B45309]" },
  Low: { fill: "bg-critical", tint: "bg-critical/15", text: "text-critical" },
} as const;

/** One concise reason summarising the confidence (first risk, else first good). */
function conciseReason(reasons: ReturnType<typeof describeFactors>): string | null {
  const risk = reasons.find((r) => r.tone === "risk");
  const good = reasons.filter((r) => r.tone === "good").map((r) => r.text);
  if (good.length >= 2) return `${good[0]} + ${good[1].toLowerCase()}`;
  if (risk && good[0]) return `${good[0]}, but ${risk.text.toLowerCase()}`;
  return good[0] ?? risk?.text ?? null;
}

export function ConfidenceSummary({
  confidence,
  className,
  compact = false,
}: {
  confidence: JourneyConfidence;
  className?: string;
  compact?: boolean;
}) {
  const { devMode } = useGer4kStore();
  const [open, setOpen] = useState(false);
  const id = useId();
  const style = BAND_STYLE[confidence.band];
  const reasons = describeFactors(confidence.factors);
  const reason = conciseReason(reasons);
  const pct = Math.max(0, Math.min(100, confidence.score));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("font-semibold text-foreground", compact ? "text-caption" : "text-body")}>
          Journey confidence
        </span>
        <span className="text-caption font-semibold text-foreground-muted">
          <span className="text-foreground">{pct}%</span> · <span className={style.text}>{confidence.band}</span>
        </span>
      </div>

      {/* Meter — text label above carries the meaning for assistive tech. */}
      <div
        className={cn("h-2.5 w-full overflow-hidden rounded-full", style.tint)}
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${bandLabel(confidence.band)}, ${pct} out of 100`}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-300 ease-out", style.fill)} style={{ width: `${pct}%` }} />
      </div>

      {reason ? <p className="text-caption text-foreground-muted">{reason}</p> : null}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-fit min-h-9 items-center gap-1 rounded-lg text-caption font-semibold text-violet hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
      >
        Why this confidence?
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        <div id={id} className="flex flex-col gap-2 rounded-xl bg-navy-800/60 px-3.5 py-3">
          <p className="text-caption text-foreground">{bandMeaning(confidence.band)}</p>
          <ul className="flex flex-col gap-1">
            {reasons.map((r) => (
              <li key={r.text} className="flex items-start gap-2 text-caption text-foreground-muted">
                <span aria-hidden="true" className={r.tone === "good" ? "text-success" : "text-[#B45309]"}>
                  {r.tone === "good" ? "✓" : "!"}
                </span>
                <span>
                  <span className="sr-only">{r.tone === "good" ? "Helps: " : "Risk: "}</span>
                  {r.text}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-foreground-subtle">
            Reliability indicator {confidence.score}/100 — not a guarantee of arrival.
          </p>
          {devMode ? (
            <ul className="mt-1 border-t border-border pt-2 font-mono text-[11px] text-foreground-muted" aria-label="Developer detail">
              {confidence.factors.map((f, i) => (
                <li key={`${f.label}-${i}`} className="flex justify-between gap-3">
                  <span>{f.label}</span>
                  <span>{f.delta >= 0 ? `+${f.delta}` : `−${Math.abs(f.delta)}`}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default ConfidenceSummary;
