import type { ReactNode } from "react";
import {
  Calculator,
  CalendarClock,
  CircleHelp,
  History,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Tag } from "@/components/ui";
import type { TagTone } from "@/components/ui";
import type { SourceStatus } from "@/types";

/**
 * SourceStatusTag — renders a record's information-source confidence
 * (`sourceStatus`) as a compact, honest label.
 *
 * ── Scope note (task 3.4 vs task 5.4) ──────────────────────────────────────
 * This is the LIGHTWEIGHT version introduced by the normal-journey slice
 * (task 3.4). It renders the `sourceStatus` axis ONLY. The simulation axis
 * (`isSimulated`) and the "SIMULATED DEMO SCENARIO" banner are a SEPARATE,
 * independent concern owned by task 5.4 (SimulatedBanner + the isSimulated-
 * driven behaviour). Task 5.4 can build on this component without rewriting it
 * — extend it with an optional `isSimulated` affordance / pair it with the
 * SimulatedBanner; do NOT collapse the two axes into one tag here.
 *
 * ── Design rules honoured ──────────────────────────────────────────────────
 *   - "label + icon, never color alone" (Req 2.2, 2.3): every status renders a
 *     Lucide icon AND a human-readable label, so meaning never depends on color
 *     perception.
 *   - SCHEDULED is shown as "Scheduled" and is NEVER presented as "Live"
 *     (Req 2.4). The label/tone/icon for each `SourceStatus` is a fixed,
 *     exhaustive map — there is no code path that maps SCHEDULED to a live
 *     presentation.
 *   - Source/status is surfaced at an appropriate granularity (per leg / per
 *     journey), not beside every text field (Req 2.2).
 */

interface SourceStatusPresentation {
  /** Human-readable label. SCHEDULED → "Scheduled", never "Live". */
  label: string;
  tone: TagTone;
  icon: ReactNode;
}

/**
 * Exhaustive, fixed presentation per {@link SourceStatus}. Because this is a
 * total `Record`, every status has exactly one label — and `SCHEDULED` maps to
 * "Scheduled", structurally guaranteeing it is never rendered as "Live".
 */
const PRESENTATION: Record<SourceStatus, SourceStatusPresentation> = {
  LIVE: {
    label: "Live",
    tone: "success",
    icon: <Radio className="size-3" strokeWidth={2.25} aria-hidden="true" />,
  },
  SCHEDULED: {
    label: "Scheduled",
    tone: "cyan",
    icon: (
      <CalendarClock className="size-3" strokeWidth={2.25} aria-hidden="true" />
    ),
  },
  OPERATOR_CONFIRMED: {
    label: "Operator confirmed",
    tone: "success",
    icon: (
      <ShieldCheck className="size-3" strokeWidth={2.25} aria-hidden="true" />
    ),
  },
  COMMUNITY_REPORTED: {
    label: "Community reported",
    tone: "violet",
    icon: <Users className="size-3" strokeWidth={2.25} aria-hidden="true" />,
  },
  // Honest-labelling guarantee (Req 4.4, 4.5): UNVERIFIED maps to its own
  // "Unverified" entry and OPERATOR_CONFIRMED (above) maps to a separate,
  // distinct entry. Because this is a total `Record<SourceStatus, …>`, there is
  // NO code path that can present UNVERIFIED as "Operator confirmed" — the two
  // are structurally independent keys.
  UNVERIFIED: {
    label: "Unverified",
    tone: "warning",
    icon: (
      <CircleHelp className="size-3" strokeWidth={2.25} aria-hidden="true" />
    ),
  },
  // Full Vision: neither is ever presented as live.
  HISTORICAL: {
    label: "Historical",
    tone: "neutral",
    icon: <History className="size-3" strokeWidth={2.25} aria-hidden="true" />,
  },
  ESTIMATED: {
    label: "Estimate",
    tone: "neutral",
    icon: <Calculator className="size-3" strokeWidth={2.25} aria-hidden="true" />,
  },
};

/** Plain-text label for a source status (for quiet one-line source summaries). */
export function sourceStatusLabel(status: SourceStatus): string {
  return PRESENTATION[status].label;
}

export interface SourceStatusTagProps {
  /** The information-source confidence to present. */
  status: SourceStatus;
  /**
   * Optional prefix read by assistive tech, e.g. "This leg is". The visible
   * label is unchanged; only the accessible name is enriched.
   */
  srLabelPrefix?: string;
  className?: string;
}

/**
 * Render a single `sourceStatus` as a labelled + iconned {@link Tag}.
 *
 * The accessible name is explicit ("Source: Scheduled") so screen-reader users
 * get the same source/status transparency sighted users do.
 */
export function SourceStatusTag({
  status,
  srLabelPrefix,
  className,
}: SourceStatusTagProps) {
  const { label, tone, icon } = PRESENTATION[status];
  const accessibleName = srLabelPrefix
    ? `${srLabelPrefix} source: ${label}`
    : `Source: ${label}`;

  return (
    <Tag
      tone={tone}
      icon={icon}
      className={className}
      role="status"
      aria-label={accessibleName}
    >
      {label}
    </Tag>
  );
}

export default SourceStatusTag;
