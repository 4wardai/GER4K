import type { StationCondition, StationPulseDetail } from "@/types";

/** Plain-language sentence for an aggregated condition. */
export function conditionSentence(condition: StationCondition, reportCount: number): string {
  if (reportCount === 0) return "No commuter reports in the last 30 minutes.";
  switch (condition) {
    case "Packed":
      return "Crowding is high right now.";
    case "Busy":
      return "Busier than usual, but moving.";
    case "Severe disruption":
      return "Commuters report trains are not running here.";
    default:
      return "Conditions look normal.";
  }
}

export function freshnessText(mostRecentAt: string | null, now: number | null): string {
  if (mostRecentAt === null) return "No recent reports";
  if (now === null) return "Updated recently";
  const min = Math.round((now - new Date(mostRecentAt).getTime()) / 60_000);
  if (min <= 1) return "Updated just now";
  if (min < 60) return `Updated ${min} min ago`;
  return `Updated ${Math.round(min / 60)} h ago`;
}

export function ageText(timestamp: string, now: number | null): string {
  if (now === null) return "recently";
  const min = Math.round((now - new Date(timestamp).getTime()) / 60_000);
  if (min <= 1) return "just now";
  return `${min} min ago`;
}

export function reportsText(n: number): string {
  return `${n} recent report${n === 1 ? "" : "s"}`;
}

/** Severity-first ordering helper for station lists. */
export function severityRank(d: StationPulseDetail | undefined): number {
  if (!d || d.summary.reportCount === 0) return -1;
  return { Normal: 0, Busy: 1, Packed: 2, "Severe disruption": 3 }[d.summary.condition];
}
