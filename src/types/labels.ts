/**
 * Independent label axes carried by every transport and community record.
 *
 * GER4K deliberately separates two orthogonal concepts so the UI never
 * conflates them:
 *
 *  - {@link SourceStatus} — *information-source confidence* (where the data came
 *    from and how trustworthy that origin is).
 *  - `isSimulated` — *simulation status* (whether the record belongs to a
 *    simulated demo scenario).
 *
 * These axes are INDEPENDENT. Neither is derived from, nor collapsed into, the
 * other. A record may be `isSimulated = true` while still carrying any
 * `SourceStatus` the scenario dictates (with the single scenario rule that a
 * simulated record is never `OPERATOR_CONFIRMED`). Callers must read and present
 * both values separately.
 */

/**
 * Information-source confidence label carried through the whole system.
 *
 * - `LIVE` — real-time data from a live feed.
 * - `SCHEDULED` — timetable/schedule data, not real-time. Must never be
 *   presented as `LIVE`.
 * - `OPERATOR_CONFIRMED` — confirmed by a real transport operator. A simulated
 *   record must never use this value.
 * - `COMMUNITY_REPORTED` — submitted/corroborated by community members.
 * - `UNVERIFIED` — unconfirmed or low-confidence information.
 */
export type SourceStatus =
  | "LIVE"
  | "SCHEDULED"
  | "OPERATOR_CONFIRMED"
  | "COMMUNITY_REPORTED"
  | "UNVERIFIED"
  /** Full Vision: derived from historical records (e.g. official OD ridership). Never live. */
  | "HISTORICAL"
  /** Full Vision: a modelled estimate (fares, ride-hail prices, walking times). Never live. */
  | "ESTIMATED";

/** Aggregated station-condition value from the predefined set. */
export type StationCondition = "Normal" | "Busy" | "Packed" | "Severe disruption";

/**
 * Selectable ranking preference profile used by the Ranking_Engine.
 * The first four are the CORE MVP set; the last three are Full Vision
 * additions (Requirement 16).
 */
export type PreferenceProfile =
  | "Balanced"
  | "Fastest"
  | "Least Walking"
  | "Fewest Transfers"
  | "Cheapest"
  | "Avoid Crowding"
  | "Accessible";

/** Every supported profile, in display order. */
export const PREFERENCE_PROFILES: readonly PreferenceProfile[] = [
  "Balanced",
  "Fastest",
  "Cheapest",
  "Least Walking",
  "Fewest Transfers",
  "Avoid Crowding",
  "Accessible",
];

/** Confidence/reliability band used for journeys and Pulse summaries. */
export type ConfidenceBand = "High" | "Medium" | "Low";

/**
 * The two independent label axes every displayed record carries.
 *
 * `sourceStatus` (information-source confidence) and `isSimulated`
 * (Data_Mode / simulation status) are independent: one is never computed from
 * the other.
 */
export interface Labelled {
  /** Information-source confidence. Independent of {@link Labelled.isSimulated}. */
  sourceStatus: SourceStatus;
  /**
   * Whether this record belongs to a simulated demo scenario.
   * Independent of {@link Labelled.sourceStatus}.
   */
  isSimulated: boolean;
}
