/**
 * Pulse_Aggregator — pure, framework-free Station Pulse aggregation.
 *
 * Aggregates recent {@link CommunityReport}s for a station into a concise
 * {@link PulseSummary} (Requirement 7.1): an aggregated {@link StationCondition}
 * from the predefined set (7.2), the number of recent reports, the most-recent
 * report time, and a confidence band (7.3). The logic is DETERMINISTIC with NO
 * machine learning (7.4): the same reports + the same reference "now" always
 * produce the same summary. It imports NOTHING from React or Next and performs
 * no I/O in its core, so it is trivially unit-testable with Vitest. A thin
 * {@link aggregatePulseForStation} wrapper is the only part that touches the
 * {@link DataProvider} boundary.
 *
 * ── Why the pure function takes `stationId` explicitly ──────────────────────
 * A {@link PulseSummary} always carries a `stationId`, but the EMPTY case (no
 * recent reports, or no reports at all) has no report to derive it from. Rather
 * than make `stationId` depend on whether reports exist, the pure core accepts
 * it as the first argument: `aggregatePulse(stationId, reports, now?)`. This
 * keeps the empty summary fully specified (Normal / Low / 0 / null) while the
 * provider wrapper simply forwards the station id it was asked about.
 *
 * ── The aggregation algorithm (implemented EXACTLY per design.md) ───────────
 *  1. RECENT WINDOW — 30 minutes. Only reports whose timestamp is within 30 min
 *     of `now` (inclusive) count. If there are NO recent reports → condition
 *     "Normal", confidence band "Low", `reportCount` 0, `mostRecentAt` null.
 *     Reports in the future relative to `now` are treated as not-recent and
 *     ignored (a deterministic, defensive choice — the window is backward-looking).
 *  2. SEVERITY MAP — Normal = 0, Busy = 1, Packed = 2, Severe disruption = 3.
 *  3. RECENCY WEIGHTING — a report in the last 10 MINUTES counts DOUBLE
 *     (weight 2); a report within 10–30 min counts single (weight 1).
 *  4. WEIGHTED SUPPORT — for each condition, sum the weights of recent reports
 *     of that condition. Pick the condition with the HIGHEST weighted support.
 *     TIE-BREAK (cautious): on a weighted-support tie, prefer the MORE SEVERE
 *     condition (the higher severity-map value). This is the "Property 8"
 *     cautious-on-ties behaviour (Requirements 7.2, 7.4).
 *  5. `reportCount` = number of RECENT reports (within 30 min). `mostRecentAt`
 *     = ISO timestamp of the most recent recent report, or null when none.
 *
 * ── Pulse confidence bands (freshness + support) ────────────────────────────
 *  - High   — most recent ≤ 10 min AND ≥ 3 recent reports.
 *  - Medium — most recent ≤ 30 min AND ≥ 1 recent report.
 *  - Low    — otherwise (includes the empty case).
 *
 * ── Labelling of the PulseSummary (the two independent {@link Labelled} axes) ─
 * The summary represents the aggregated COMMUNITY channel, so its
 * `sourceStatus` is always "COMMUNITY_REPORTED" — including the empty case,
 * which still describes "what the community channel currently says about this
 * station" (nothing recent). `isSimulated` is derived from the contributing
 * RECENT reports: it is `true` when ANY recent report is `isSimulated`
 * (the demo seeds are `isSimulated = true`, so the TRX / Chan Sow Lin summaries
 * come out `isSimulated = true`, letting the UI communicate their simulated /
 * seeded demo nature honestly). The empty case has no contributors → `false`.
 * The two axes stay INDEPENDENT: `isSimulated` is never derived from
 * `sourceStatus` or vice versa.
 */

import type { DataProvider } from "@/data";
import type {
  CommunityReport,
  PulseSummary,
  StationCondition,
} from "@/types";

/** The recent window, in minutes. Reports older than this do not count. */
export const RECENT_WINDOW_MIN = 30;

/** Reports within this many minutes of `now` count double (recency weighting). */
export const DOUBLE_WEIGHT_WINDOW_MIN = 10;

/** Minimum recent reports required for the High confidence band. */
export const HIGH_BAND_MIN_REPORTS = 3;

/**
 * Severity map for the predefined {@link StationCondition} set. Higher means
 * worse — used both for the cautious tie-break and ordering. The order of this
 * array also defines the candidate conditions considered during aggregation.
 */
export const CONDITION_SEVERITY: Record<StationCondition, number> = {
  Normal: 0,
  Busy: 1,
  Packed: 2,
  "Severe disruption": 3,
};

/** All predefined conditions, ascending by severity. */
const ALL_CONDITIONS: StationCondition[] = (
  Object.keys(CONDITION_SEVERITY) as StationCondition[]
).sort((a, b) => CONDITION_SEVERITY[a] - CONDITION_SEVERITY[b]);

/** Coerce a `Date | number` reference time to epoch milliseconds. */
function toMillis(now: Date | number): number {
  return now instanceof Date ? now.getTime() : now;
}

/** Age of a report (in minutes) relative to `nowMs`; negative for future reports. */
function ageMinutes(report: CommunityReport, nowMs: number): number {
  return (nowMs - new Date(report.timestamp).getTime()) / 60_000;
}

/**
 * Recency weight for a report given its age in minutes:
 *   - last 10 minutes (0 ≤ age ≤ 10) → 2 (double)
 *   - within 10–30 minutes (10 < age ≤ 30) → 1 (single)
 * Reports outside the 30-min window or in the future are filtered out before
 * this is called, so this never returns 0 in practice.
 */
function recencyWeight(ageMin: number): number {
  return ageMin <= DOUBLE_WEIGHT_WINDOW_MIN ? 2 : 1;
}

/**
 * Aggregate recent community reports for a single station into a
 * {@link PulseSummary}. PURE CORE: explicit inputs, deterministic output, no I/O,
 * no framework imports.
 *
 * @param stationId The station the summary is about. Used directly on the
 *   returned summary so the empty case is still fully specified.
 * @param reports Community reports (any ages / any stations). Only reports
 *   within the 30-min recent window relative to `now` contribute; callers may
 *   pass a station's full report list and let this filter by recency. (The
 *   provider wrapper already scopes reports to the station.)
 * @param now Reference "now" for testability. Defaults to `Date.now()`.
 */
export function aggregatePulse(
  stationId: string,
  reports: CommunityReport[],
  now: Date | number = Date.now(),
): PulseSummary {
  const nowMs = toMillis(now);

  // 1. Keep only reports within the backward-looking 30-min window.
  const recent = reports.filter((r) => {
    const age = ageMinutes(r, nowMs);
    return age >= 0 && age <= RECENT_WINDOW_MIN;
  });

  // Empty case → Normal / Low / 0 / null, community channel, not simulated.
  if (recent.length === 0) {
    return {
      stationId,
      condition: "Normal",
      reportCount: 0,
      mostRecentAt: null,
      confidence: { band: "Low" },
      sourceStatus: "COMMUNITY_REPORTED",
      isSimulated: false,
    };
  }

  // 2–4. Sum recency-weighted support per condition, then pick the winner with
  // the cautious (more-severe) tie-break.
  const supportByCondition: Record<StationCondition, number> = {
    Normal: 0,
    Busy: 0,
    Packed: 0,
    "Severe disruption": 0,
  };
  for (const r of recent) {
    supportByCondition[r.condition] += recencyWeight(ageMinutes(r, nowMs));
  }

  let winner: StationCondition = ALL_CONDITIONS[0];
  for (const condition of ALL_CONDITIONS) {
    const support = supportByCondition[condition];
    const winnerSupport = supportByCondition[winner];
    // Strictly greater wins; on a tie, prefer the MORE SEVERE condition. Because
    // ALL_CONDITIONS is ascending by severity, iterating in order and replacing
    // on `>=` for equal-or-greater support naturally keeps the more severe one
    // on ties — but we only replace when support is strictly greater OR (equal
    // support AND this condition is more severe) to be explicit.
    if (
      support > winnerSupport ||
      (support === winnerSupport &&
        CONDITION_SEVERITY[condition] > CONDITION_SEVERITY[winner])
    ) {
      // Only the conditions that actually have support can win; a condition with
      // zero support never beats one with positive support via this branch
      // (support > winnerSupport handles that). The tie branch only applies when
      // both have the SAME (possibly positive) support.
      winner = condition;
    }
  }

  // 5. reportCount + mostRecentAt from the recent set.
  const reportCount = recent.length;
  let mostRecentAt = recent[0].timestamp;
  let mostRecentMs = new Date(mostRecentAt).getTime();
  for (const r of recent) {
    const ms = new Date(r.timestamp).getTime();
    if (ms > mostRecentMs) {
      mostRecentMs = ms;
      mostRecentAt = r.timestamp;
    }
  }

  // Confidence band — freshness (age of most recent) + support (count).
  const mostRecentAgeMin = (nowMs - mostRecentMs) / 60_000;
  const band =
    mostRecentAgeMin <= DOUBLE_WEIGHT_WINDOW_MIN &&
    reportCount >= HIGH_BAND_MIN_REPORTS
      ? "High"
      : mostRecentAgeMin <= RECENT_WINDOW_MIN && reportCount >= 1
        ? "Medium"
        : "Low";

  // isSimulated — true when ANY contributing recent report is simulated.
  const isSimulated = recent.some((r) => r.isSimulated);

  return {
    stationId,
    condition: winner,
    reportCount,
    mostRecentAt,
    confidence: { band },
    sourceStatus: "COMMUNITY_REPORTED",
    isSimulated,
  };
}

/**
 * DataProvider-backed convenience wrapper (Requirement 7.1).
 *
 * Reads the station's reports via `provider.getReports(stationId)` and delegates
 * to the pure {@link aggregatePulse}, forwarding the requested `stationId` so the
 * empty case still carries it. Keeping the core pure means this wrapper is the
 * only part that touches the data boundary.
 *
 * @param provider The data access boundary.
 * @param stationId The station to aggregate.
 * @param now Reference "now" for testability. Defaults to `Date.now()`.
 */
export function aggregatePulseForStation(
  provider: DataProvider,
  stationId: string,
  now: Date | number = Date.now(),
): PulseSummary {
  return aggregatePulse(stationId, provider.getReports(stationId), now);
}
