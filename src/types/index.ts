/**
 * Shared GER4K domain types.
 *
 * Barrel export so consumers can `import type { ... } from "@/types"`.
 * These are pure, framework-free TypeScript types (no React/Next imports).
 */

export type {
  SourceStatus,
  StationCondition,
  PreferenceProfile,
  ConfidenceBand,
  Labelled,
} from "./labels";

export { PREFERENCE_PROFILES } from "./labels";

export type {
  Station,
  LineKind,
  WalkLink,
  NetworkLine,
  NetworkSegment,
  NetworkInterchange,
  TransportNetwork,
} from "./network";

export type {
  JourneyLeg,
  Journey,
  Disruption,
  JourneyImpact,
  ConfidenceFactor,
  JourneyConfidence,
  RankedJourney,
} from "./journey";

export type {
  StationReportType,
  CommunityReport,
  NewCommunityReport,
  PulseSummary,
  PulseTrend,
  PulseSignal,
  StationPulseDetail,
} from "./pulse";

export type {
  FareItem,
  JourneyFare,
  FareRules,
  StrategyTag,
  JourneyOption,
  RideHailEstimate,
  JourneyOptionsResult,
  LineInfo,
  LineStatusValue,
  LineStatus,
  DemandBand,
  HistoricalDemandRecord,
  HistoricalDemandDataset,
  HistoricalDemand,
  SavedJourney,
  RecentSearch,
  MobilityNeed,
  ContributorLevel,
  PointsState,
  SavedJourneyAlert,
} from "./fullVision";
