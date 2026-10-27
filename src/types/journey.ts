/**
 * Journey, disruption, ranking, and confidence models.
 *
 * All of these are framework-free (no React/Next imports). Legs, journeys, and
 * disruptions extend {@link Labelled} so they carry the two independent label
 * axes (`sourceStatus` + `isSimulated`).
 */

import type { Labelled, StationCondition, ConfidenceBand } from "./labels";

/** A single leg of a multimodal journey. */
export interface JourneyLeg extends Labelled {
  /** Origin station id. */
  from: string;
  /** Destination station id. */
  to: string;
  /** Transport mode: MRT / LRT / Monorail / KTM / Rapid KL Bus / MRT Feeder. */
  mode: string;
  /** Line name/id for the leg, when the mode runs on a named line. */
  line?: string;
  /** Estimated travel time for the leg, in minutes. */
  travelTimeMin: number;
  /** Walking distance for the leg, in metres. */
  walkMeters: number;
  /**
   * Full Vision: what kind of leg this is. Absent means an in-vehicle ride
   * (every CORE planner leg). "walk" = access/egress walking; "ride-hail" =
   * the estimated ride-hailing fallback.
   */
  legKind?: "ride" | "walk" | "ride-hail";
  /** Full Vision: network line id for ride legs (the CORE `line` holds the display name). */
  lineId?: string;
  /** Full Vision: typical headway for the service, in minutes. */
  headwayMin?: number;
}

/** A complete multimodal journey composed of ordered legs. */
export interface Journey extends Labelled {
  id: string;
  /** Ordered legs from origin to destination. */
  legs: JourneyLeg[];
  /** Total estimated travel time across all legs, in minutes. */
  totalTimeMin: number;
  /** Number of transfers in the journey. */
  transfers: number;
  /** Total walking distance across all legs, in metres. */
  totalWalkMeters: number;
  /**
   * Full Vision comparison attributes (Requirement 15). Optional so CORE
   * journeys are unchanged; the Ranking_Engine treats a missing value as 0
   * (constant across candidates → contributes nothing).
   */
  /** Estimated total public-transport fare, in sen. */
  fareSen?: number;
  /** Max Pulse severity (0–3) at stations where the passenger boards, transfers or alights. */
  crowdLevel?: number;
  /** Count of touch stations with a recent lift/escalator or entrance issue. */
  accessIssues?: number;
}

/** A disruption affecting a segment of the network. */
export interface Disruption extends Labelled {
  id: string;
  /** The network segment this disruption affects. */
  affectedSegment: { from: string; to: string; line?: string };
  /** Severity expressed as a station condition, e.g. "Severe disruption". */
  severity: StationCondition;
}

/** The result of evaluating whether a disruption affects a journey. */
export interface JourneyImpact {
  /** True when at least one leg of the journey is affected. */
  affected: boolean;
  /** Indexes of the affected legs within the journey's `legs` array. */
  affectedLegIndexes: number[];
}

/** A single contributing factor to a journey's confidence score. */
export interface ConfidenceFactor {
  /** Human-readable description of the factor. */
  label: string;
  /** Additive delta this factor contributes to the score. */
  delta: number;
}

/** An explainable confidence/reliability indicator for a journey. */
export interface JourneyConfidence {
  /** Final clamped score in the range 0..100. */
  score: number;
  /** Band derived from the score thresholds. */
  band: ConfidenceBand;
  /** The contributing factors, for the "Why this confidence?" reveal. */
  factors: ConfidenceFactor[];
}

/** A recovery alternative paired with its rank and confidence. */
export interface RankedJourney {
  journey: Journey;
  /** 1-based rank position after deterministic ranking. */
  rank: number;
  confidence: JourneyConfidence;
}
