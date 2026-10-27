/**
 * Full Vision Prototype models (Requirements 14–35).
 *
 * Framework-free types for fares, journey options, ride-hail estimates, line
 * status, historical demand, saved journeys, mobility needs and contributor
 * points. Records that are displayed carry the two independent label axes via
 * {@link Labelled}.
 */

import type { Labelled, PreferenceProfile } from "./labels";
import type { Journey, JourneyConfidence } from "./journey";

// ── Fare (Requirement 14) ─────────────────────────────────────────────────

/** One component of a journey's fare estimate. */
export interface FareItem {
  /** e.g. "Rail fare (integrated)", "Rapid KL bus 300", "Replacement bus". */
  label: string;
  amountSen: number;
  /** Journey leg indexes covered by this item. */
  legIndexes: number[];
  note?: string;
}

/** A deterministic fare estimate. Always `sourceStatus = "ESTIMATED"`. */
export interface JourneyFare extends Labelled {
  totalSen: number;
  items: FareItem[];
}

/** Local fare rules used by the Fare_Engine (demo estimates). */
export interface FareRules {
  /** Flat fare for a Rapid KL bus leg, in sen. */
  busFlatSen: number;
  /** Fare for a scenario replacement bus, in sen (normally free). */
  replacementBusSen: number;
  /** Fallback per-minute rail fare when a segment has no `fareSen`. */
  railFallbackSenPerMin: number;
  /** Ride-hail model. */
  rideHail: {
    baseSen: number;
    perKmSen: number;
    perMinSen: number;
    surgeMax: number;
    roadFactor: number;
    fastKmh: number;
    slowKmh: number;
    pickupMin: number;
  };
}

// ── Journey options (Requirements 15, 18, 22) ────────────────────────────

/** Strategy labels shown on meaningful options. */
export type StrategyTag =
  | "Fastest"
  | "Cheapest"
  | "Least walking"
  | "Fewest changes"
  | "Least crowded";

/** A fully enriched, presentable journey option. */
export interface JourneyOption {
  /** Stable unique id derived from the route signature. */
  id: string;
  /** Passenger-facing title, e.g. "via TRX + Pasar Seni". */
  title: string;
  /** The journey with comparison attributes set (fareSen, crowdLevel, accessIssues). */
  journey: Journey;
  fare: JourneyFare;
  confidence: JourneyConfidence;
  strategies: StrategyTag[];
  /** 1-based rank under the requested profile (within the presented set). */
  rank: number;
  /** Stations where the passenger boards, transfers or alights, in order. */
  touchStationIds: string[];
  /** Every station along the path in order, including pass-through stops. */
  pathStationIds: string[];
  hasBus: boolean;
  /** True when any leg is simulated (e.g. a scenario replacement bus). */
  isSimulated: boolean;
}

/** Estimated rail + ride-hailing fallback (Requirement 23). */
export interface RideHailEstimate extends Labelled {
  hailStationId: string;
  destinationId: string;
  /** Rail part from the origin to the hail station. */
  railJourney: Journey;
  railFareSen: number;
  roadKm: number;
  rideMinRange: [number, number];
  totalMinRange: [number, number];
  rideCostSenRange: [number, number];
  totalCostSenRange: [number, number];
}

/** Result of building options for one origin/destination. */
export interface JourneyOptionsResult {
  mode: "normal" | "recovery";
  profile: PreferenceProfile;
  /** Meaningful options, ranked for `profile` (index 0 = recommended). */
  options: JourneyOption[];
  /** Every validated candidate, including dominated ones (for Ask GER4K). */
  candidates: JourneyOption[];
  rideHail: RideHailEstimate | null;
}

// ── Service / line status (Requirement 26) ───────────────────────────────

/** Static line metadata for the Service screen and map. */
export interface LineInfo {
  lineId: string;
  name: string;
  /** Short code shown in chips, e.g. "PYL", "KGL", "KJL". */
  code: string;
  mode: string;
  /** Official GTFS route colour, "#RRGGBB". */
  colour: string;
  /** Text colour to use on the line colour. */
  textColour: string;
  operator: string;
  /** Real-world terminus names for direction text: [start, end] of `realOrder`. */
  termini: [string, string];
  /** Fixture station ids in real-world order along the line (for direction). */
  realOrder: string[];
  kind: "rail" | "bus" | "replacement-bus";
  /** GTFS route description, e.g. "Putrajaya ~ Kwasa Damansara". */
  description: string;
  headwayText?: string;
  isSimulated?: boolean;
}

export type LineStatusValue = "Normal" | "Disrupted";

/** A line's status, with the service notice and community notes layered apart. */
export interface LineStatus extends Labelled {
  lineId: string;
  status: LineStatusValue;
  /** Short service notice, e.g. "Disrupted between TRX and Conlay". */
  notice: string | null;
  affectedStationIds: string[];
  /** Community-derived notes that never change the status pill. */
  communityNotes: { stationId: string; condition: string }[];
}

// ── Historical demand (Requirement 27) ───────────────────────────────────

export type DemandBand = "HIGH" | "MEDIUM" | "LOW";

export interface HistoricalDemandRecord {
  stationId: string;
  /** Station name as it appears in the official dataset. */
  datasetName: string;
  avgWeekdayTrips: number;
  rank: number;
  of: number;
  percentile: number;
}

export interface HistoricalDemandDataset {
  source: string;
  sourceUrl: string;
  license: string;
  window: [string, string];
  weekdays: number;
  measure: string;
  records: HistoricalDemandRecord[];
}

export interface HistoricalDemand extends Labelled {
  stationId: string;
  band: DemandBand;
  record: HistoricalDemandRecord;
}

// ── Saved journeys, mobility, points (Requirements 25, 28–30) ────────────

export interface SavedJourney {
  id: string;
  label: string;
  originId: string;
  destinationId: string;
  createdAt: string;
}

export interface RecentSearch {
  originId: string;
  destinationId: string;
  at: string;
}

export type MobilityNeed =
  | "less-walking"
  | "fewer-transfers"
  | "avoid-stairs"
  | "wheelchair"
  | "elderly";

export type ContributorLevel =
  | "New Contributor"
  | "Reliable Contributor"
  | "Community Helper";

export interface PointsState {
  total: number;
  acceptedReports: number;
  /** Most recent awards, newest first (bounded). */
  history: { stationId: string; reportType: string; points: number; at: string }[];
}

/** Proactive alert for a saved journey (Requirement 29). */
export interface SavedJourneyAlert {
  savedJourneyId: string;
  label: string;
  originId: string;
  destinationId: string;
  disruptionId: string;
  affectedFrom: string;
  affectedTo: string;
  lineName: string;
  isSimulated: boolean;
}
