"use client";

import { cn } from "@/components/ui";
import type { ChatMessage, EvidenceItem, GerakKhasAction } from "@/services/gerak-khas/types";
import { GerakKhasActions } from "./GerakKhasActions";
import { GerakKhasVisual } from "./GerakKhasVisual";

/**
 * GerakKhasMessage — renders one transcript entry from the STRUCTURED response
 * (Requirement 9). Evidence carries two independent labels: the `sourceStatus`
 * value and, separately, a "SIMULATED LIVE DATA" chip when `isSimulated`.
 */

function sourceText(status: string): string {
  switch (status) {
    case "ESTIMATED":
      return "Demo fare estimate";
    case "HISTORICAL":
      return "Historical data";
    case "COMMUNITY_REPORTED":
      return "Community reported";
    case "SCHEDULED":
      return "Scheduled (not live)";
    case "UNVERIFIED":
      return "Unverified";
    case "OPERATOR_CONFIRMED":
      return "Operator confirmed";
    case "LIVE":
      return "Live";
    default:
      return status;
  }
}

function EvidenceRow({ item }: { item: EvidenceItem }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-body text-foreground">
      <span className="font-semibold">{item.label}:</span>
      <span>{item.value}</span>
      <span className="text-caption text-foreground-subtle">· {sourceText(item.sourceStatus)}</span>
      {item.isSimulated ? (
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-500">
          Simulated live data
        </span>
      ) : null}
    </li>
  );
}

export function GerakKhasMessage({
  message,
  onAction,
}: {
  message: ChatMessage;
  onAction?: (action: GerakKhasAction) => void;
}) {
  const isUser = message.role === "user";
  const res = message.response;

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-body",
          isUser ? "bg-violet text-white" : "bg-navy-800/60 text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>

      {!isUser && res ? (
        <div className="mt-2 flex w-full max-w-[92%] flex-col gap-2">
          {res.evidence && res.evidence.length > 0 ? (
            <ul className="flex flex-col gap-1 rounded-2xl border border-border bg-surface px-3.5 py-3">
              {res.evidence.map((e, i) => (
                <EvidenceRow key={`${e.tool}-${i}`} item={e} />
              ))}
            </ul>
          ) : null}

          {res.confidence ? (
            <p className="text-caption text-foreground-muted">
              Confidence: <span className="font-semibold text-foreground">{res.confidence.band}</span> — {res.confidence.meaning}
            </p>
          ) : null}

          {res.warnings && res.warnings.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {res.warnings.map((w, i) => (
                <li key={i} className="text-caption text-amber-500">! {w}</li>
              ))}
            </ul>
          ) : null}

          {res.visual ? <GerakKhasVisual visual={res.visual} /> : null}

          {res.actions && res.actions.length > 0 ? (
            <GerakKhasActions actions={res.actions} onAction={onAction} />
          ) : null}

          {res.source ? (
            <p className="text-[11px] text-foreground-subtle">
              {res.source.ai ? "Worded by AI from GER4K's results" : "From GER4K's structured data"}. GER4K computes the facts; Gerak Khas only explains them.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default GerakKhasMessage;
