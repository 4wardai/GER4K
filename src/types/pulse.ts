/**
 * Station Pulse community-report models.
 *
 * Framework-free (no React/Next imports). Stored reports and aggregated
 * summaries extend {@link Labelled} so they carry the two independent label axes
 * (`sourceStatus` + `isSimulated`). A freshly submitted report (see
 * {@link NewCommunityReport}) is not yet labelled — the Station_Pulse assigns
 * the labels on submission.
 */

import type { Labelled, StationCondition, ConfidenceBand } from "./labels";

/**
 * Full Vision: the structured report types a passenger can submit
 * (Requirement 25.1). Free-form text is deliberately not supported.
 *
 *  - Crowd types (Normal, Busy, Packed, Cannot board) and "Train stopped" feed
 *    the CORE Pulse_Aggregator through their mapped {@link StationCondition}.
 *  - The rest are *signals* shown alongside the summary; they never dilute the
 *    crowd aggregation.
 */
export type StationReportType =
  | "Normal"
  | "Busy"
  | "Packed"
  | "Cannot board"
  | "Delay"
  | "Train moving slowly"
  | "Train stopped"
  | "Replacement bus available"
  | "Entrance closed"
  | "Lift/escalator issue";

/** A stored community report about conditions at a station. */
export interface CommunityReport extends Labelled {
  id: string;
  /** Station the report is about. */
  stationId: string;
  /** Reported condition. */
  condition: StationCondition;
  /** Submission time as an ISO 8601 string. */
  timestamp: string;
  /**
   * Full Vision: the structured report type. Absent on CORE reports, which are
   * crowd reports whose type equals their condition.
   */
  reportType?: StationReportType;
}

/**
 * The payload for a new community report submission.
 *
 * Only the user-supplied fields; the id, timestamp, and label axes are assigned
 * by the Station_Pulse when the report is recorded.
 */
export interface NewCommunityReport {
  stationId: string;
  condition: StationCondition;
  /** Full Vision: structured report type (Requirement 25.1). */
  reportType?: StationReportType;
}

/** An aggregated summary of recent community reports for a station. */
export interface PulseSummary extends Labelled {
  stationId: string;
  /** Aggregated condition for the station. */
  condition: StationCondition;
  /** Number of recent reports contributing to the summary. */
  reportCount: number;
  /** ISO timestamp of the most recent contributing report, or null when none. */
  mostRecentAt: string | null;
  /** Confidence band derived from freshness and support. */
  confidence: { band: ConfidenceBand };
}

/** Full Vision: direction of recent crowding change. */
export type PulseTrend = "rising" | "steady" | "easing";

/** Full Vision: a grouped non-crowd signal at a station. */
export interface PulseSignal {
  type: StationReportType;
  count: number;
  mostRecentAt: string;
  /** True when any contributing report is simulated (seeded demo data). */
  isSimulated: boolean;
}

/** Full Vision: summary + trend + signals for the station detail sheet. */
export interface StationPulseDetail {
  summary: PulseSummary;
  trend: PulseTrend;
  signals: PulseSignal[];
  /** All recent reports (any type) for the "See reports" list, newest first. */
  recentReports: CommunityReport[];
}
