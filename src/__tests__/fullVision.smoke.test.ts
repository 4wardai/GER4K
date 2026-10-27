/**
 * Full Vision happy-path smoke test (task 34.2) — the target demo at domain
 * level: plan → compare → disrupt → recover → re-rank → Pulse → report →
 * points → line status → historical demand → Ask → saved alert → reset.
 */
import { describe, it, expect } from "vitest";

import {
  buildScenarioReports,
  buildSeededReports,
  createMockDataProvider,
  demoDisruption,
  demoStations,
  historicalDemandDataset,
  lineInfo,
  DEMO_DESTINATION_ID,
  DEMO_ORIGIN_ID,
  LINE_IDS,
  STATION_IDS,
} from "@/data";
import { planJourney } from "@/domain/transport";
import { evaluateImpact } from "@/domain/disruption";
import { buildJourneyOptions, pulseDetailsFor } from "@/domain/options";
import { aggregateStationPulse, awardForReport, EMPTY_POINTS } from "@/domain/community";
import { deriveLineStatuses } from "@/domain/service";
import { historicalDemandFor } from "@/domain/demand";
import { evaluateSavedJourneyAlerts } from "@/domain/personal";
import { answerAsk } from "@/services/ai/askAnswer";
import { buildCopilotRequest, buildStationContexts } from "@/services/ai/buildCopilotRequest";
import type { PreferenceProfile, PulseSummary } from "@/types";

const NOW = new Date("2026-10-26T08:30:00.000+08:00").getTime();
const nameOf = (id: string) => demoStations.find((s) => s.id === id)?.name ?? id;

describe("GER4K full-vision demo chain (smoke)", () => {
  it("runs the target demo end to end on the domain", () => {
    const provider = createMockDataProvider();
    const core = provider.getNetwork();
    const reports = (scenario: boolean) => (id: string) => [
      ...buildSeededReports(NOW).filter((r) => r.stationId === id),
      ...provider.getReports(id).filter((r) => !r.isSimulated),
      ...(scenario ? buildScenarioReports(NOW).filter((r) => r.stationId === id) : []),
    ];
    const ids = demoStations.map((s) => s.id);
    const options = (scenario: boolean, profile: PreferenceProfile) =>
      buildJourneyOptions({
        network: provider.getMultimodalNetwork({ includeScenarioServices: scenario }),
        coreNetwork: core,
        originId: DEMO_ORIGIN_ID,
        destinationId: DEMO_DESTINATION_ID,
        disruptions: scenario ? [demoDisruption] : [],
        pulseByStation: pulseDetailsFor(ids, reports(scenario), NOW),
        fareRules: provider.getFareRules(),
        profile,
        stationName: nameOf,
      });

    // 1–7. Normal day: multiple options with ETA, fare, changes, walking.
    const normal = options(false, "Balanced");
    expect(normal.options.length).toBeGreaterThanOrEqual(2);
    expect(normal.options[0].fare.totalSen).toBe(420);

    // 8–11. Disruption affects the usual route → recovery recommends via Pasar Seni.
    const usual = planJourney(provider, DEMO_ORIGIN_ID, DEMO_DESTINATION_ID);
    if (!usual.ok) throw new Error("no usual route");
    expect(evaluateImpact(usual.journey, [demoDisruption], core).affected).toBe(true);
    const recovery = options(true, "Balanced");
    expect(recovery.mode).toBe("recovery");
    expect(recovery.options[0].title).toBe("via TRX + Pasar Seni");

    // 12–14. Comparison incl. bus-supported + ride-hail; profiles re-rank.
    expect(recovery.options.some((o) => o.hasBus)).toBe(true);
    expect(recovery.rideHail).not.toBeNull();
    expect(options(true, "Least Walking").options[0].title).toBe("via Chan Sow Lin + Masjid Jamek");

    // 15–16. TRX Pulse: Packed, reports, High confidence, rising.
    const trx = aggregateStationPulse(STATION_IDS.trx, reports(true)(STATION_IDS.trx), NOW);
    expect(trx.summary.condition).toBe("Packed");
    expect(trx.trend).toBe("rising");

    // 17–18. Report → UNVERIFIED, +5 points.
    const r = provider.submitReport({ stationId: STATION_IDS.trx, condition: "Normal", reportType: "Packed" });
    expect(r.sourceStatus).toBe("UNVERIFIED");
    expect(awardForReport(EMPTY_POINTS, { stationId: r.stationId, reportType: "Packed", at: r.timestamp }).awarded).toBe(5);

    // 19. Line status: Putrajaya disrupted (simulated, unverified).
    const pulseMap = new Map<string, PulseSummary>([[STATION_IDS.trx, trx.summary]]);
    const status = deriveLineStatuses(lineInfo, core, [demoDisruption], pulseMap, nameOf).find(
      (s) => s.lineId === LINE_IDS.putrajaya,
    )!;
    expect(status.status).toBe("Disrupted");
    expect(status.isSimulated).toBe(true);

    // 20. Historical demand (HISTORICAL).
    expect(historicalDemandFor(historicalDemandDataset, STATION_IDS.trx)?.band).toBe("HIGH");

    // 21. Ask GER4K: why this route / avoid TRX.
    const stations = buildStationContexts(ids, demoStations, pulseDetailsFor(ids, reports(true), NOW), historicalDemandDataset, NOW);
    const req = (q: string) => buildCopilotRequest({ result: recovery, question: q, stations, destinationName: "KLCC" })!;
    expect(answerAsk(req("Why this route?")).answer.intent).toBe("why_route");
    expect(answerAsk(req("Can I avoid TRX?")).answer.suggestion?.title).toBe("via Chan Sow Lin + Masjid Jamek");

    // 22–24. Saved journey alert while active; none after reset.
    const saved = [{ id: "w", label: "Work", originId: DEMO_ORIGIN_ID, destinationId: DEMO_DESTINATION_ID, createdAt: "x" }];
    expect(evaluateSavedJourneyAlerts(saved, core, [demoDisruption])).toHaveLength(1);
    expect(evaluateSavedJourneyAlerts(saved, core, [])).toHaveLength(0);
    expect(options(false, "Balanced").mode).toBe("normal");
  });
});
