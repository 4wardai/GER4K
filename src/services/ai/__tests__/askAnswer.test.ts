/**
 * Full Vision — Ask GER4K co-pilot intents and structured answers (Req 31).
 * Built on real domain options for the recovery scenario; no AI, no network.
 */
import { describe, it, expect } from "vitest";

import {
  buildScenarioReports,
  buildSeededReports,
  createMockDataProvider,
  demoDisruption,
  demoStations,
  DEMO_DESTINATION_ID,
  DEMO_ORIGIN_ID,
  historicalDemandDataset,
  STATION_IDS,
} from "@/data";
import { buildJourneyOptions, pulseDetailsFor } from "@/domain/options";
import { answerAsk, mapQuestionToIntent } from "@/services/ai/askAnswer";
import { buildCopilotRequest, buildStationContexts } from "@/services/ai/buildCopilotRequest";
import type { PreferenceProfile } from "@/types";

const NOW = new Date("2026-10-26T08:30:00.000+08:00").getTime();
const provider = createMockDataProvider();
const nameOf = (id: string) => demoStations.find((s) => s.id === id)?.name ?? id;
const seeds = [...buildSeededReports(NOW), ...buildScenarioReports(NOW)];
const pulse = pulseDetailsFor(demoStations.map((s) => s.id), (id) => seeds.filter((r) => r.stationId === id), NOW);
const stations = buildStationContexts(demoStations.map((s) => s.id), demoStations, pulse, historicalDemandDataset, NOW);

function ask(question: string, profile: PreferenceProfile = "Balanced") {
  const result = buildJourneyOptions({
    network: provider.getMultimodalNetwork({ includeScenarioServices: true }),
    coreNetwork: provider.getNetwork(),
    originId: DEMO_ORIGIN_ID,
    destinationId: DEMO_DESTINATION_ID,
    disruptions: [demoDisruption],
    pulseByStation: pulse,
    fareRules: provider.getFareRules(),
    profile,
    stationName: nameOf,
  });
  const req = buildCopilotRequest({ result, question, stations, destinationName: "KLCC" });
  if (!req) throw new Error("expected a request");
  return { res: answerAsk(req), result };
}

describe("Ask GER4K — intent mapping (Req 31.2, 16.4)", () => {
  it.each([
    ["Why this route?", "why_route"],
    ["Why this confidence?", "why_confidence"],
    ["Can I avoid TRX?", "avoid_station"],
    ["Which option is cheaper?", "cheapest"],
    ["I'm on a budget.", "cheapest"],
    ["Is there a bus alternative?", "bus_option"],
    ["Which route has less walking?", "less_walking"],
    ["I'm travelling with my grandmother.", "accessible"],
    ["I don't want packed stations.", "avoid_crowds"],
    ["What is happening at TRX?", "station_status"],
    ["I want the fastest route", "fastest"],
  ])("%s → %s", (q, intent) => {
    expect(mapQuestionToIntent(q, stations).intent).toBe(intent);
  });
});

describe("Ask GER4K — structured answers (Req 31.3, 31.4)", () => {
  it("Why this route? explains the hero vs the runner-up with crowding context", () => {
    const { res } = ask("Why this route?");
    expect(res.answer.title).toBe("Via TRX + Pasar Seni is your fastest recovery");
    expect(res.answer.lead).toBe("TRX is crowded, but this route still gets you to KLCC about 7 minutes sooner than via Chan Sow Lin + Masjid Jamek.");
    expect(res.answer.followUps.map((f) => f.label)).toEqual(expect.arrayContaining(["Less walking", "Avoid crowds"]));
    expect(res.reranked).toBeUndefined();
  });

  it("Less walking re-ranks via the domain and suggests the Chan Sow Lin route", () => {
    const { res } = ask("Which route has less walking?");
    expect(res.reranked?.profile).toBe("Least Walking");
    expect(res.answer.title).toBe("Got it.");
    expect(res.answer.suggestion?.title).toBe("via Chan Sow Lin + Masjid Jamek");
    expect(res.answer.suggestion?.walkMeters).toBe(260);
  });

  it("Can I avoid TRX? suggests an option that doesn't change at TRX", () => {
    const { res } = ask("Can I avoid TRX?");
    expect(res.answer.intent).toBe("avoid_station");
    expect(res.answer.suggestion?.title).toBe("via Chan Sow Lin + Masjid Jamek");
    expect(res.answer.bullets.join(" ")).not.toContain("passes through TRX");
  });

  it("Cheapest suggests the simulated replacement bus and says so", () => {
    const { res } = ask("What's cheapest?");
    expect(res.answer.suggestion?.title).toBe("via replacement bus from TRX");
    expect(res.answer.suggestion?.fareSen).toBe(340);
    expect(res.answer.bullets.join(" ")).toContain("simulated");
  });

  it("Is there a bus alternative? uses domain options only", () => {
    const { res, result } = ask("Is there a bus alternative?");
    const ids = new Set(result.candidates.map((c) => c.id));
    expect(res.answer.suggestion && ids.has(res.answer.suggestion.optionId)).toBe(true);
    expect(res.answer.title.startsWith("Yes — ")).toBe(true);
  });

  it("What is happening at TRX? reports Pulse + historical context honestly", () => {
    const { res } = ask("What is happening at TRX?");
    expect(res.answer.title).toBe("TRX: Packed");
    expect(res.answer.bullets.join(" ")).toContain("Crowding is increasing");
    expect(res.answer.bullets.join(" ")).toContain("historical data");
    expect(res.answer.stationId).toBe(STATION_IDS.trx);
  });

  it("Grandmother → Accessible profile, with no fabricated lift claims", () => {
    const { res } = ask("I'm travelling with my grandmother.");
    expect(res.reranked?.profile).toBe("Accessible");
    expect(res.answer.suggestion?.title).toBe("via Chan Sow Lin + Masjid Jamek");
    expect(res.answer.bullets.join(" ")).toContain("no live lift");
  });
});
