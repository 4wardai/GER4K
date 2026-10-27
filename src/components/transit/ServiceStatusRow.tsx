"use client";

import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";

import type { LineStatus } from "@/types";
import { cn } from "@/components/ui";
import { lineInfoFor } from "./lineStyle";

/**
 * ServiceStatusRow — one line's status as a scannable row (Requirements 39.4,
 * 42.3): line badge in its official colour, name, affected segment or
 * description, and a Normal/Disrupted status pill. Extracted so Home and the
 * Service screen render line status identically. Purely presentational.
 */
export function ServiceStatusRow({
  status,
  stationName,
  showCommunity = true,
  href,
}: {
  status: LineStatus;
  stationName: (id: string) => string;
  showCommunity?: boolean;
  href?: string;
}) {
  const info = lineInfoFor(status.lineId);
  if (!info) return null;
  const disrupted = status.status === "Disrupted";

  const body = (
    <>
      <span
        className="flex h-9 min-w-[3rem] shrink-0 items-center justify-center rounded-lg px-2 text-body font-extrabold"
        style={{ backgroundColor: info.colour, color: info.textColour }}
      >
        {info.code}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body font-semibold text-foreground">{info.name}</span>
        {disrupted && status.notice ? (
          <span className="truncate text-caption font-medium text-critical">{status.notice}</span>
        ) : showCommunity && status.communityNotes.length > 0 ? (
          <span className="truncate text-caption text-foreground-muted">
            Commuters: {status.communityNotes.map((n) => `${stationName(n.stationId)} ${n.condition.toLowerCase()}`).join(", ")}
          </span>
        ) : (
          <span className="truncate text-caption text-foreground-muted">{info.mode} · {info.description}</span>
        )}
      </span>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-caption font-bold",
          disrupted ? "bg-critical/10 text-critical" : "bg-success/10 text-success",
        )}
      >
        {disrupted ? (
          <TriangleAlert className="size-3.5" aria-hidden="true" />
        ) : (
          <span className="size-2 rounded-full bg-success" aria-hidden="true" />
        )}
        {disrupted ? "Disrupted" : "Normal"}
      </span>
      {href ? <ChevronRight className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" /> : null}
    </>
  );

  const base = "flex min-h-16 items-center gap-3 px-4 py-3";
  if (href) {
    return (
      <Link
        href={href}
        className={cn(base, "hover:bg-navy-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet")}
      >
        {body}
      </Link>
    );
  }
  return <div className={base}>{body}</div>;
}

export default ServiceStatusRow;
