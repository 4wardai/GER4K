/**
 * Full Vision — station pulse detail, report validation, points, historical
 * demand, line status, saved-journey alerts and mobility needs
 * (Requirements 24–27, 29, 30).
 */
import { describe, it, expect } from "vitest";

import {
  aggregateStationPulse,
  awardForReport,
  contributorLevel,
  EMPTY_POINTS,
  nextLevel,
  validateNewReport,
} from "@/domain/community";
import { demandBand, historicalDemandFor } from "@/domain/demand";
import { deriveLineStatuses, simulatedNextArrivalMin } from "@/domain/service";
import { evaluateSavedJourneyAlerts, profileForMobilityNeeds } from "@/domain/personal";
import {
  buildScenarioReports,
  buildSeededReports,
  createMockDataProvider,
  demoDisruption,
  demoNetwork,
  demoStations,
  historicalDemandDataset,
  lineInfo,
  LINE_IDS,
  STATION_IDS,
} from "@/data";
import type { PulseSummary, SavedJourney } from "@/types";

const NOW = new Date("2026-10-26T08:30:00.000+08:00").getTime();
const nameOf = (id: string) => demoStations.find((s) => s.id === id)?.name ?? id;

describe("Station pulse detail (Req 24, 25.8)", () => {
  it("TRX seeds → Packed, 12 reports, High confidence, rising", () => {
    const d = aggregateStationPulse(STATION_IDS.trx, buildSeededReports(NOW), NOW);
    expect(d.summary.condition).toBe("Packed");
    expect(d.summary.reportCount).toBe(12);
    expect(d.summary.confidence.band).toBe("High");
    expect(d.trend).toBe("rising");
    expect(d.signals.find((s) => s.type === "Cannot board")?.count).toBe(1);
  });

  it("signal-only reports never dilute crowd aggregation", () => {
    const seeds = [...buildSeededReports(NOW), ...buildScenarioReports(NOW)];
    const d = aggregateStationPulse(STATION_IDS.trx, seeds, NOW);
    expect(d.summary.condition).toBe("Packed");
    expect(d.summary.reportCount).toBe(13); // + scenario "Cannot board"; the bus signal is not counted
    expect(d.signals.some((s) => s.type === "Replacement bus available")).toBe(true);
    const conlay = aggregateStationPulse(STATION_IDS.conlay, seeds, NOW);
    expect(conlay.summary.condition).toBe("Severe disruption");
  });

  it("validates required fields, naming the missing one", () => {
    expect(validateNewReport({ stationId: "", reportType: "Busy" })).toMatchObject({ ok: false, field: "stationId" });
    expect(validateNewReport({ stationId: "trx", reportType: null })).toMatchObject({ ok: false, field: "reportType" });
    expect(validateNewReport({ stationId: "trx", reportType: "Busy" })).toEqual({ ok: true });
  });

  it("a new structured submission starts UNVERIFIED and not simulated", () => {
    const p = createMockDataProvider();
    const r = p.submitReport({ stationId: STATION_IDS.trx, condition: "Normal", reportType: "Cannot board" });
    expect(r.sourceStatus).toBe("UNVERIFIED");
    expect(r.isSimulated).toBe(false);
    expect(r.condition).toBe("Packed");
    expect(r.reportType).toBe("Cannot board");
  });
});

describe("GER4K Points (Req 25.4–25.6)", () => {
  it("awards +5 and ignores a duplicate within 2 minutes", () => {
    const at = new Date(NOW).toISOString();
    const first = awardForReport(EMPTY_POINTS, { stationId: "trx", reportType: "Packed", at });
    expect(first.awarded).toBe(5);
    const dup = awardForReport(first.state, { stationId: "trx", reportType: "Packed", at });
    expect(dup.awarded).toBe(0);
    expect(dup.duplicate).toBe(true);
    expect(dup.state.total).toBe(5);
    const other = awardForReport(dup.state, { stationId: "trx", reportType: "Busy", at });
    expect(other.state.total).toBe(10);
  });

  it("derives contributor levels from rewarded reports", () => {
    expect(contributorLevel(0)).toBe("New Contributor");
    expect(contributorLevel(5)).toBe("Reliable Contributor");
    expect(contributorLevel(20)).toBe("Community Helper");
    expect(nextLevel(3)).toEqual({ level: "Reliable Contributor", remaining: 2 });
    expect(nextLevel(25)).toBeNull();
  });
});

describe("Historical demand (Req 27)", () => {
  it("bands by percentile and is always HISTORICAL", () => {
    expect(demandBand(0.97)).toBe("HIGH");
    expect(demandBand(0.43)).toBe("MEDIUM");
    expect(demandBand(0.24)).toBe("LOW");
    const trx = historicalDemandFor(historicalDemandDataset, STATION_IDS.trx)!;
    expect(trx.band).toBe("HIGH");
    expect(trx.sourceStatus).toBe("HISTORICAL");
    expect(trx.isSimulated).toBe(false);
  });
});

describe("Line status (Req 26)", () => {
  const pulse = new Map<string, PulseSummary>([
    [STATION_IDS.trx, { stationId: STATION_IDS.trx, condition: "Packed", reportCount: 12, mostRecentAt: null, confidence: { band: "High" }, sourceStatus: "COMMUNITY_REPORTED", isSimulated: true }],
  ]);

  it("normal day: Normal demo status with community notes kept separate", () => {
    const st = deriveLineStatuses(lineInfo, demoNetwork, [], pulse, nameOf);
    const pyl = st.find((s) => s.lineId === LINE_IDS.putrajaya)!;
    expect(pyl.status).toBe("Normal");
    expect(pyl.isSimulated).toBe(true);
    expect(pyl.communityNotes).toEqual([{ stationId: STATION_IDS.trx, condition: "Packed" }]);
  });

  it("scenario: Putrajaya Line Disrupted, simulated and never operator-confirmed", () => {
    const st = deriveLineStatuses(lineInfo, demoNetwork, [demoDisruption], pulse, nameOf);
    const pyl = st.find((s) => s.lineId === LINE_IDS.putrajaya)!;
    expect(pyl.status).toBe("Disrupted");
    expect(pyl.notice).toBe("Service disrupted between TRX and Conlay");
    expect(pyl.sourceStatus).not.toBe("OPERATOR_CONFIRMED");
    expect(pyl.isSimulated).toBe(true);
    expect(st.find((s) => s.lineId === LINE_IDS.kajang)!.status).toBe("Normal");
  });
});

describe("Saved-journey alerts + mobility needs (Req 29, 30)", () => {
  const saved: SavedJourney[] = [
    { id: "s1", label: "Work", originId: STATION_IDS.putrajayaSentral, destinationId: STATION_IDS.klcc, createdAt: "x" },
    { id: "s2", label: "Market", originId: STATION_IDS.masjidJamek, destinationId: STATION_IDS.klcc, createdAt: "x" },
  ];

  it("alerts only the affected saved journey, and only when a disruption is active", () => {
    expect(evaluateSavedJourneyAlerts(saved, demoNetwork, [])).toEqual([]);
    const alerts = evaluateSavedJourneyAlerts(saved, demoNetwork, [demoDisruption]);
    expect(alerts.map((a) => a.savedJourneyId)).toEqual(["s1"]);
    expect(alerts[0]).toMatchObject({ lineName: "Putrajaya Line", affectedFrom: "trx", affectedTo: "conlay", isSimulated: true });
  });

  it("maps mobility needs to a default profile", () => {
    expect(profileForMobilityNeeds(["elderly"], "Balanced")).toBe("Accessible");
    expect(profileForMobilityNeeds(["less-walking", "fewer-transfers"], "Balanced")).toBe("Least Walking");
    expect(profileForMobilityNeeds(["fewer-transfers"], "Balanced")).toBe("Fewest Transfers");
    expect(profileForMobilityNeeds([], "Cheapest")).toBe("Cheapest");
  });

  it("simulated arrivals stay within the headway", () => {
    for (let m = 0; m < 30; m++) {
      const v = simulatedNextArrivalMin("feeder-t509", 15, NOW + m * 60_000);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(15);
    }
  });
});
