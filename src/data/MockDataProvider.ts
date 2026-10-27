/**
 * MockDataProvider — the ONLY runtime DataProvider in GER4K.
 *
 * "Mock" here means a predictable, LOCAL, offline provider backed by the
 * corrected demo fixture (see `./mock/fixture`). It does NOT invent rail data
 * and makes NO external calls at runtime — the demo works fully offline.
 *
 * It is framework-free (no React/Next imports), synchronous, and in-memory, so
 * the domain core and tests can consume it directly. Submitted reports are held
 * in a private in-memory store for the lifetime of the instance.
 *
 * Label axes (see {@link import("@/types").Labelled}):
 *  - Network/schedule-derived records → `sourceStatus = "SCHEDULED"`,
 *    `isSimulated = false` (applied when legs are built from the network).
 *  - The demo disruption → `sourceStatus = "UNVERIFIED"`, `isSimulated = true`.
 *  - Seeded Pulse reports → `sourceStatus = "COMMUNITY_REPORTED"`,
 *    `isSimulated = true`. They are re-anchored to "now" on every read so they
 *    stay inside the 30-min window for the whole demo session.
 *  - NEW live submissions → `sourceStatus = "UNVERIFIED"`, `isSimulated = false`
 *    (community-report lifecycle; requirement 9.2). No auto-promotion to
 *    `COMMUNITY_REPORTED` — verification is a FUTURE capability.
 */

import type { DataProvider, MultimodalNetworkOptions } from "./DataProvider";
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
import {
  demoNetwork,
  demoStations,
  demoDisruption,
  buildSeededReports,
  buildScenarioReports,
  conditionForReportType,
} from "./mock/fixture";
import {
  busInterchanges,
  busLines,
  busSegments,
  scenarioInterchanges,
  scenarioLines,
  scenarioSegments,
  walkLinks,
} from "./mock/multimodal";
import { lineInfo } from "./mock/lineInfo";
import { historicalDemandDataset } from "./mock/historicalDemand";
import { demoFareRules } from "./mock/fareRules";

export class MockDataProvider implements DataProvider {
  private readonly network: TransportNetwork;
  private readonly disruptions: Disruption[];
  /** Reports submitted (or restored) during this instance's lifetime. */
  private submitted: CommunityReport[] = [];
  /** Monotonic counter for generating unique submitted-report ids. */
  private submittedCount = 0;

  constructor() {
    this.network = demoNetwork;
    // getDisruptions() returns the demo disruption directly. Activation / reset
    // of the Demo_Scenario is consumer-gated (see DemoScenarioProvider).
    this.disruptions = [demoDisruption];
  }

  getStations(): Station[] {
    return demoStations;
  }

  getNetwork(): TransportNetwork {
    return this.network;
  }

  getDisruptions(): Disruption[] {
    return this.disruptions;
  }

  getReports(stationId: string): CommunityReport[] {
    // Seeds are materialised relative to "now", then submitted reports appended.
    return [...buildSeededReports(), ...this.submitted].filter(
      (r) => r.stationId === stationId,
    );
  }

  submitReport(newReport: NewCommunityReport): CommunityReport {
    this.submittedCount += 1;
    const condition = newReport.reportType
      ? conditionForReportType(newReport.reportType)
      : newReport.condition;
    const stored: CommunityReport = {
      id: `submitted-${Date.now().toString(36)}-${this.submittedCount}`,
      stationId: newReport.stationId,
      condition,
      ...(newReport.reportType ? { reportType: newReport.reportType } : {}),
      timestamp: new Date().toISOString(),
      // New live submissions start unverified and are NOT simulated
      // (requirement 9.2; no auto-promotion to COMMUNITY_REPORTED).
      sourceStatus: "UNVERIFIED",
      isSimulated: false,
    };
    this.submitted.push(stored);
    return stored;
  }

  // ── Full Vision ───────────────────────────────────────────────────────────

  getMultimodalNetwork(options: MultimodalNetworkOptions): TransportNetwork {
    const withScenario = options.includeScenarioServices;
    return {
      stations: this.network.stations,
      lines: [
        ...this.network.lines,
        ...busLines,
        ...(withScenario ? scenarioLines : []),
      ],
      segments: [
        ...this.network.segments,
        ...busSegments,
        ...(withScenario ? scenarioSegments : []),
      ],
      interchanges: [
        ...this.network.interchanges,
        ...busInterchanges,
        ...(withScenario ? scenarioInterchanges : []),
      ],
      walkLinks,
    };
  }

  getScenarioReports(stationId: string): CommunityReport[] {
    return buildScenarioReports().filter((r) => r.stationId === stationId);
  }

  getLineInfo(): LineInfo[] {
    return lineInfo;
  }

  getHistoricalDemand(): HistoricalDemandDataset {
    return historicalDemandDataset;
  }

  getFareRules(): FareRules {
    return demoFareRules;
  }

  restoreReports(reports: CommunityReport[]): void {
    const known = new Set(this.submitted.map((r) => r.id));
    for (const r of reports) {
      // Restored reports keep their original labels; only genuine user
      // submissions are ever restored (UNVERIFIED / not simulated).
      if (!known.has(r.id)) this.submitted.push(r);
    }
  }
}

/**
 * Shared singleton instance for the app to use.
 */
export const mockDataProvider: DataProvider = new MockDataProvider();

/** Factory for callers (e.g. tests) that want a fresh, isolated instance. */
export function createMockDataProvider(): DataProvider {
  return new MockDataProvider();
}
