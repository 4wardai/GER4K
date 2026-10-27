/**
 * Station pulse detail — Full Vision extension of the CORE Pulse_Aggregator
 * (Requirements 24, 25).
 *
 * Pure and deterministic. The CORE {@link aggregatePulse} is reused unchanged
 * for the crowd summary; this module only decides WHICH reports feed it and
 * adds a trend and grouped service/facility signals.
 *
 *  - Crowd reports (Normal, Busy, Packed, Cannot board, Train stopped) feed the
 *    aggregator through their mapped condition.
 *  - Signal reports (Delay, Train moving slowly, Replacement bus available,
 *    Entrance closed, Lift/escalator issue) never dilute crowd aggregation;
 *    they are grouped as signals. "Cannot board" and "Train stopped" are ALSO
 *    surfaced as signals because they are notable on their own.
 *  - Trend compares the mean severity of crowd reports aged 0–10 min with those
 *    aged 10–30 min: ≥ +0.5 rising, ≤ −0.5 easing, otherwise steady (also
 *    steady when either group is empty).
 */

import type {
  CommunityReport,
  PulseSignal,
  PulseTrend,
  StationPulseDetail,
  StationReportType,
} from "@/types";
import {
  aggregatePulse,
  CONDITION_SEVERITY,
  DOUBLE_WEIGHT_WINDOW_MIN,
  RECENT_WINDOW_MIN,
} from "./pulseAggregator";

/** Report types grouped for the quick-report UI (Requirement 25.1). */
export const REPORT_TYPE_GROUPS: ReadonlyArray<{
  group: "Crowding" | "Trains" | "Station";
  types: StationReportType[];
}> = [
  { group: "Crowding", types: ["Normal", "Busy", "Packed", "Cannot board"] },
  { group: "Trains", types: ["Delay", "Train moving slowly", "Train stopped"] },
  {
    group: "Station",
    types: ["Replacement bus available", "Entrance closed", "Lift/escalator issue"],
  },
];

/** Every structured report type. */
export const ALL_REPORT_TYPES: StationReportType[] = REPORT_TYPE_GROUPS.flatMap(
  (g) => g.types,
);

const CROWD_TYPES = new Set<StationReportType>([
  "Normal",
  "Busy",
  "Packed",
  "Cannot board",
  "Train stopped",
]);

const SIGNAL_TYPES = new Set<StationReportType>([
  "Cannot board",
  "Delay",
  "Train moving slowly",
  "Train stopped",
  "Replacement bus available",
  "Entrance closed",
  "Lift/escalator issue",
]);

/** Report types that indicate an accessibility issue at a station. */
export const ACCESS_ISSUE_TYPES = new Set<StationReportType>([
  "Lift/escalator issue",
  "Entrance closed",
]);

/** The structured type of a report (CORE reports derive it from the condition). */
export function reportTypeOf(report: CommunityReport): StationReportType {
  if (report.reportType) return report.reportType;
  return report.condition === "Severe disruption" ? "Train stopped" : report.condition;
}

/** True when the report should feed the crowd aggregation. */
export function isCrowdReport(report: CommunityReport): boolean {
  return CROWD_TYPES.has(reportTypeOf(report));
}

function ageMin(report: CommunityReport, nowMs: number): number {
  return (nowMs - new Date(report.timestamp).getTime()) / 60_000;
}

function isRecent(report: CommunityReport, nowMs: number): boolean {
  const a = ageMin(report, nowMs);
  return a >= 0 && a <= RECENT_WINDOW_MIN;
}

/** Deterministic crowding trend (see module docstring). */
export function computeTrend(
  reports: CommunityReport[],
  now: number = Date.now(),
): PulseTrend {
  const crowd = reports.filter((r) => isCrowdReport(r) && isRecent(r, now));
  const late = crowd.filter((r) => ageMin(r, now) <= DOUBLE_WEIGHT_WINDOW_MIN);
  const early = crowd.filter((r) => ageMin(r, now) > DOUBLE_WEIGHT_WINDOW_MIN);
  if (late.length === 0 || early.length === 0) return "steady";
  const mean = (rs: CommunityReport[]) =>
    rs.reduce((s, r) => s + CONDITION_SEVERITY[r.condition], 0) / rs.length;
  const diff = mean(late) - mean(early);
  if (diff >= 0.5) return "rising";
  if (diff <= -0.5) return "easing";
  return "steady";
}

/** Group recent signal reports by type, most recent first. */
export function computeSignals(
  reports: CommunityReport[],
  now: number = Date.now(),
): PulseSignal[] {
  const byType = new Map<StationReportType, PulseSignal>();
  for (const r of reports) {
    if (!isRecent(r, now)) continue;
    const type = reportTypeOf(r);
    if (!SIGNAL_TYPES.has(type)) continue;
    const existing = byType.get(type);
    if (!existing) {
      byType.set(type, {
        type,
        count: 1,
        mostRecentAt: r.timestamp,
        isSimulated: r.isSimulated,
      });
    } else {
      existing.count += 1;
      if (r.timestamp > existing.mostRecentAt) existing.mostRecentAt = r.timestamp;
      existing.isSimulated = existing.isSimulated || r.isSimulated;
    }
  }
  return [...byType.values()].sort((a, b) =>
    a.mostRecentAt < b.mostRecentAt ? 1 : a.mostRecentAt > b.mostRecentAt ? -1 : 0,
  );
}

/**
 * Summary (CORE aggregator over crowd reports) + trend + signals + the recent
 * report list for a station.
 */
export function aggregateStationPulse(
  stationId: string,
  reports: CommunityReport[],
  now: number = Date.now(),
): StationPulseDetail {
  const forStation = reports.filter((r) => r.stationId === stationId);
  const summary = aggregatePulse(stationId, forStation.filter(isCrowdReport), now);
  const recentReports = forStation
    .filter((r) => isRecent(r, now))
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
  return {
    summary,
    trend: computeTrend(forStation, now),
    signals: computeSignals(forStation, now),
    recentReports,
  };
}

/** Validation result for a new structured report (Requirement 25.3 / 9.4). */
export type ReportValidation =
  | { ok: true }
  | { ok: false; field: "stationId" | "reportType"; message: string };

/** Reject a report missing its station or type, naming the missing field. */
export function validateNewReport(input: {
  stationId?: string | null;
  reportType?: string | null;
}): ReportValidation {
  if (!input.stationId || input.stationId.trim().length === 0) {
    return { ok: false, field: "stationId", message: "Choose a station to report on." };
  }
  if (!input.reportType || !ALL_REPORT_TYPES.includes(input.reportType as StationReportType)) {
    return { ok: false, field: "reportType", message: "Choose what you are seeing." };
  }
  return { ok: true };
}
