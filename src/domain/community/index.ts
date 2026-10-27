/**
 * GER4K community (Station Pulse) domain barrel.
 *
 * Pure, framework-free Pulse_Aggregator exports. Consumers import from
 * `@/domain/community` rather than reaching into individual files.
 *
 * `aggregatePulse(stationId, reports, now?)` is the pure CORE that aggregates
 * recent community reports for a station into a {@link PulseSummary}
 * (deterministic, no ML — Requirements 7.1–7.4).
 * `aggregatePulseForStation(provider, stationId, now?)` is the DataProvider-backed
 * wrapper. Full Vision adds station detail (trend, signals), structured report
 * validation and GER4K Points.
 */

export {
  aggregatePulse,
  aggregatePulseForStation,
  RECENT_WINDOW_MIN,
  DOUBLE_WEIGHT_WINDOW_MIN,
  HIGH_BAND_MIN_REPORTS,
  CONDITION_SEVERITY,
} from "./pulseAggregator";

export {
  aggregateStationPulse,
  computeTrend,
  computeSignals,
  validateNewReport,
  reportTypeOf,
  isCrowdReport,
  REPORT_TYPE_GROUPS,
  ALL_REPORT_TYPES,
  ACCESS_ISSUE_TYPES,
} from "./stationPulse";
export type { ReportValidation } from "./stationPulse";

export {
  awardForReport,
  contributorLevel,
  nextLevel,
  EMPTY_POINTS,
  LEVELS,
  POINTS_PER_REPORT,
  DUPLICATE_WINDOW_MIN,
} from "./points";
