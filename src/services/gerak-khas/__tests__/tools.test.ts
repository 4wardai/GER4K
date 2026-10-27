import { describe, it, expect, beforeAll } from "vitest";

import {
  demoStations,
  historicalDemandDataset,
  mockDataProvider,
  DEMO_ORIGIN_ID,
  DEMO_DESTINATION_ID,
  STATION_IDS,
} from "@/data";
import { buildJourneyOptions, pulseDetailsFor } from "@/domain/options";
import { buildStationContexts } from "@/services/ai/buildCopilotRequest";
import { stationName } from "@/components/state/useLiveData";
import type { CurrentJourneyContext } from "../types";
import {
  journeyTool,
  recoveryTool,
  rankingTool,
  fareTool,
  walkingTool,
  pulseTool,
  stationTool,
  busTool,
  serviceStatusTool,
  accessibilityTool,
  historicalDemandTool,
  applyConstraints,
} from "../tools";

/**
 * Build a real recovery-mode CurrentJourneyContext from the live demo fixtures
 * (scenario active) so the tools are exercised against genuine domain output.
 */
function buildContext(): CurrentJourneyContext {
  const now = Date.now();
  const core = mockDataProvider.getNetwork();
  const disruptions = mockDataProvider.getDisruptions();
  const pulse = pulseDetailsFor(
    demoStations.map((s) => s.id),
    (id) => [...mockDataProvider.getReports(id), ...mockDataProvider.getScenarioReports(id)],
    now,
  );
  const result = buildJourneyOptions({
    network: mockDataProvider.getMultimodalNetwork({ includeScenarioServices: true }),
    coreNetwork: core,
    originId: DEMO_ORIGIN_ID,
    destinationId: DEMO_DESTINATION_ID,
    disruptions,
    isRecovery: true,
    pulseByStation: pulse,
    fareRules: mockDataProvider.getFareRules(),
    profile: "Balanced",
    stationName,
  });
  const stations = buildStationContexts(
    demoStations.map((s) => s.id),
    demoStations,
    pulse,
    historicalDemandDataset,
    now,
  );
  const pulseObj: CurrentJourneyContext["pulse"] = {};
  pulse.forEach((d, id) => (pulseObj[id] = d));
  return {
    originId: DEMO_ORIGIN_ID,
    destinationId: DEMO_DESTINATION_ID,
    originName: stationName(DEMO_ORIGIN_ID),
    destinationName: stationName(DEMO_DESTINATION_ID),
    usualRouteId: null,
    selectedRouteId: result.options[0]?.id ?? null,
    options: result.options,
    candidates: result.candidates,
    profile: "Balanced",
    mobilityNeeds: [],
    recovery: true,
    disruption: { summary: "TRX -> Conlay", severity: "severe" },
    pulse: pulseObj,
    stations,
    now,
  };
}

let ctx: CurrentJourneyContext;
beforeAll(() => {
  ctx = buildContext();
});

describe("mobility tools (real fixtures)", () => {
  it("JourneyTool returns the selected option with time/transfer/walk evidence", () => {
    const r = journeyTool(ctx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.selected).toBeTruthy();
      expect(r.evidence.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("JourneyTool reports unavailable with no context", () => {
    const r = journeyTool(null);
    expect(r.ok).toBe(false);
  });

  it("RecoveryTool surfaces recovery alternatives", () => {
    const r = recoveryTool(ctx);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.alternatives.length).toBeGreaterThan(0);
  });

  it("RankingTool orders via the Ranking_Engine for Cheapest", () => {
    const r = rankingTool(ctx.options, "Cheapest");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.ordered.length).toBe(ctx.options.length);
  });

  it("FareTool returns an ESTIMATED, non-simulated fare", () => {
    const r = fareTool(ctx.options[0]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.formatted).toMatch(/^RM\d+\.\d{2}$/);
      expect(r.evidence[0].sourceStatus).toBe("ESTIMATED");
      expect(r.evidence[0].isSimulated).toBe(false);
    }
  });

  it("WalkingTool returns walking in metres", () => {
    const r = walkingTool(ctx.options[0]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.formatted).toMatch(/\d+ m$/);
  });

  it("PulseTool reads COMMUNITY_REPORTED pulse for TRX", () => {
    const r = pulseTool(STATION_IDS.trx, ctx.stations);
    // TRX is seeded in the scenario; expect a reading or an honest 'no reports'.
    if (r.ok) {
      expect(r.evidence[0].sourceStatus).toBe("COMMUNITY_REPORTED");
    } else {
      expect(r.reason).toContain("report");
    }
  });

  it("PulseTool is honest for an unknown station", () => {
    const r = pulseTool("not-a-station", ctx.stations);
    expect(r.ok).toBe(false);
  });

  it("StationTool returns lines for Pasar Seni", () => {
    const r = stationTool(STATION_IDS.pasarSeni, ctx.stations);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.lines.length).toBeGreaterThan(0);
  });

  it("BusTool surfaces a bus-supported option (bus 300 or Replacement bus)", () => {
    const r = busTool(ctx);
    if (r.ok) {
      expect(r.data.option.hasBus).toBe(true);
      // Replacement bus is simulated; Rapid KL bus 300 is not.
      const simEvidence = r.evidence.find((e) => e.label === r.data.option.title);
      expect(simEvidence?.isSimulated).toBe(r.data.option.isSimulated);
    } else {
      expect(r.reason).toContain("bus");
    }
  });

  it("ServiceStatusTool reports a disrupted line as simulated during the demo", () => {
    const r = serviceStatusTool(mockDataProvider.getDisruptions(), ctx.pulse, stationName);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const disrupted = r.data.statuses.find((s) => s.status === "Disrupted");
      expect(disrupted?.isSimulated).toBe(true);
    }
  });

  it("AccessibilityTool is honest-uncertainty-first", () => {
    const r = accessibilityTool(STATION_IDS.klcc, ["elderly"], ctx.stations);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.preference).toBe("Accessible");
      expect(r.data.uncertainty.toLowerCase()).toContain("signage");
      expect(r.evidence.every((e) => e.sourceStatus === "UNVERIFIED")).toBe(true);
    }
  });

  it("HistoricalDemandTool is labelled HISTORICAL", () => {
    const r = historicalDemandTool(STATION_IDS.klcc);
    if (r.ok) {
      expect(r.evidence[0].sourceStatus).toBe("HISTORICAL");
      expect(r.evidence[0].isSimulated).toBe(false);
    }
  });

  it("constraint filter drops options touching TRX", () => {
    const before = ctx.options.length + ctx.candidates.length;
    const res = applyConstraints([...ctx.options, ...ctx.candidates], {
      excludeStationIds: [STATION_IDS.trx],
      requireBus: false,
      requireAccessiblePreference: false,
    });
    expect(res.subset.every((o) => !o.touchStationIds.includes(STATION_IDS.trx) && !o.pathStationIds.includes(STATION_IDS.trx))).toBe(true);
    expect(res.subset.length).toBeLessThanOrEqual(before);
  });

  it("constraint filter requireBus keeps only bus options", () => {
    const res = applyConstraints([...ctx.options, ...ctx.candidates], {
      excludeStationIds: [],
      requireBus: true,
      requireAccessiblePreference: false,
    });
    expect(res.subset.every((o) => o.hasBus)).toBe(true);
  });

  it("never collapses sourceStatus and isSimulated into one field", () => {
    const r = journeyTool(ctx);
    if (r.ok) {
      for (const e of r.evidence) {
        expect(typeof e.sourceStatus).toBe("string");
        expect(typeof e.isSimulated).toBe("boolean");
      }
    }
  });
});
