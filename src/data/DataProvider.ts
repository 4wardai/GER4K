/**
 * Framework-free data access boundary for GER4K.
 *
 * `DataProvider` is the ONLY way the domain core (Journey_Planner,
 * Disruption_Monitor, Recovery_Engine, Pulse_Aggregator, …) reaches transport
 * and community data. It imports nothing from React or Next — it is pure
 * TypeScript and independently unit-testable with Vitest.
 *
 * Operations are intentionally SYNCHRONOUS and IN-MEMORY: they return plain
 * values, not Promises. Most GER4K screens compute synchronously against this
 * interface, so keeping it promise-free keeps the domain simple and testable.
 *
 * ── Label axes ────────────────────────────────────────────────────────────
 * Every record returned here carries the two INDEPENDENT label axes defined by
 * {@link import("@/types").Labelled}: `sourceStatus` (information-source
 * confidence) and `isSimulated` (simulation/demo status). Both mocked data and
 * any FUTURE real source MUST flow through this same `sourceStatus` +
 * `isSimulated` tagging — neither axis is ever derived from the other, and the
 * swap from mock to real data must not change how records are labelled.
 *
 * ── MVP implementation ────────────────────────────────────────────────────
 * The MVP implements ONLY `MockDataProvider` (see task 2.3) — a predictable,
 * local, offline provider backed by the corrected demo fixture. It is the only
 * runtime provider in the MVP.
 *
 * ── Future implementations (behind this SAME interface, NOT built here) ─────
 * The following providers are intentionally documented but NOT implemented for
 * the hackathon MVP. They exist to keep the swap path honest without expanding
 * scope:
 *
 *  - `StaticGtfsProvider` — GTFS static stops / routes / schedules as the base
 *    network. (FUTURE — not built.)
 *  - `LiveTransportProvider` — real-time transport feeds where genuinely
 *    available. (FUTURE — not built.)
 *  - real `CommunityProvider` — persisted, verified community reports.
 *    (FUTURE — not built.)
 *
 * When these land, they implement this exact interface and tag records through
 * the same `sourceStatus` + `isSimulated` axes, so the domain core is unchanged.
 */

import type {
  Station,
  TransportNetwork,
  Disruption,
  CommunityReport,
  NewCommunityReport,
  LineInfo,
  HistoricalDemandDataset,
  FareRules,
} from "@/types";

/** Options for {@link DataProvider.getMultimodalNetwork}. */
export interface MultimodalNetworkOptions {
  /**
   * Include services that only exist in the simulated Demo_Scenario (e.g. the
   * replacement bus). Consumers pass `true` only while the scenario is active.
   */
  includeScenarioServices: boolean;
}

/**
 * The framework-free data access boundary. Implemented by `MockDataProvider`
 * for the MVP; future real providers implement the same contract.
 *
 * Full Vision additions (Requirement 18, 26, 27, 14): the multimodal network,
 * scenario-only reports, line metadata, historical demand and fare rules.
 * `getNetwork()` still returns the CORE rail network unchanged.
 */
export interface DataProvider {
  /** All stations in the network. */
  getStations(): Station[];

  /** The full transport network (stations, lines, segments, interchanges). */
  getNetwork(): TransportNetwork;

  /** The currently active disruptions. */
  getDisruptions(): Disruption[];

  /** Recent community reports for a given station. */
  getReports(stationId: string): CommunityReport[];

  /**
   * Record a new community report and return the stored, labelled record.
   *
   * The provider assigns the id, timestamp, and the two label axes
   * (`sourceStatus` + `isSimulated`) on submission.
   */
  submitReport(newReport: NewCommunityReport): CommunityReport;

  // ── Full Vision ─────────────────────────────────────────────────────────

  /**
   * The CORE rail network plus bus services, walk links and (optionally) the
   * simulated scenario services. Bus/scenario lines carry `kind` and
   * `isSimulated` so legs can be labelled honestly.
   */
  getMultimodalNetwork(options: MultimodalNetworkOptions): TransportNetwork;

  /** Seeded reports that only exist while the simulated scenario is active. */
  getScenarioReports(stationId: string): CommunityReport[];

  /** Official line metadata (names, colours, direction termini). */
  getLineInfo(): LineInfo[];

  /** Historical demand extracted from official OD ridership (HISTORICAL). */
  getHistoricalDemand(): HistoricalDemandDataset;

  /** Demo fare rules used by the Fare_Engine (ESTIMATED). */
  getFareRules(): FareRules;

  /**
   * Restore previously submitted reports (e.g. from localStorage) without
   * re-labelling them. Optional: only local providers need it.
   */
  restoreReports?(reports: CommunityReport[]): void;
}
