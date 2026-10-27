/**
 * GER4K Points — pure, local contributor rewards (Requirement 25).
 *
 * +5 points per accepted structured report. A duplicate (same station and
 * report type within 2 minutes of an earlier rewarded report) is still a valid
 * report but earns 0 points and does not count toward the contributor level.
 * No economy, redemption or payments — those are FUTURE.
 */

import type { ContributorLevel, PointsState } from "@/types";

export const POINTS_PER_REPORT = 5;
export const DUPLICATE_WINDOW_MIN = 2;
const HISTORY_LIMIT = 30;

export const EMPTY_POINTS: PointsState = { total: 0, acceptedReports: 0, history: [] };

/** Level thresholds by rewarded report count. */
export const LEVELS: ReadonlyArray<{ level: ContributorLevel; minReports: number }> = [
  { level: "New Contributor", minReports: 0 },
  { level: "Reliable Contributor", minReports: 5 },
  { level: "Community Helper", minReports: 20 },
];

export function contributorLevel(acceptedReports: number): ContributorLevel {
  let current: ContributorLevel = "New Contributor";
  for (const l of LEVELS) if (acceptedReports >= l.minReports) current = l.level;
  return current;
}

/** The next level and how many rewarded reports remain to reach it (null at the top). */
export function nextLevel(
  acceptedReports: number,
): { level: ContributorLevel; remaining: number } | null {
  const next = LEVELS.find((l) => l.minReports > acceptedReports);
  return next ? { level: next.level, remaining: next.minReports - acceptedReports } : null;
}

/** Award points for a report. Pure: returns the new state and what happened. */
export function awardForReport(
  state: PointsState,
  report: { stationId: string; reportType: string; at: string },
): { state: PointsState; awarded: number; duplicate: boolean } {
  const atMs = new Date(report.at).getTime();
  const duplicate = state.history.some(
    (h) =>
      h.points > 0 &&
      h.stationId === report.stationId &&
      h.reportType === report.reportType &&
      Math.abs(atMs - new Date(h.at).getTime()) <= DUPLICATE_WINDOW_MIN * 60_000,
  );
  const awarded = duplicate ? 0 : POINTS_PER_REPORT;
  const history = [
    { stationId: report.stationId, reportType: report.reportType, points: awarded, at: report.at },
    ...state.history,
  ].slice(0, HISTORY_LIMIT);
  return {
    state: {
      total: state.total + awarded,
      acceptedReports: state.acceptedReports + (duplicate ? 0 : 1),
      history,
    },
    awarded,
    duplicate,
  };
}
