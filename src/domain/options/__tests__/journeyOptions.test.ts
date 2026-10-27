/**
 * Full Vision — fare, extended ranking and Journey_Options_Engine
 * (Requirements 14, 15, 16, 18, 22, 23).
 *
 * Deterministic: Pulse uses a fixed NOW and seeds materialised relative to it.
 */
import { describe, it, expect } from "vitest";

import {
  createMockDataProvider,
  buildSeededReports,
  buildScenarioReports,
  demoDisruption,
  demoNetwork,
  demoStations,
  DEMO_ORIGIN_ID,
  DEMO_DESTINATION_ID,
  STATION_IDS,
  LINE_IDS,
} from "@/data";
import { planJourney } from "@/domain/transport";
import { computeJourneyFare } from "@/domain/fare";
import { rankAlternatives, findRecoveryOnNetwork, journeySegments } from "@/domain/recovery";
import { buildJourneyOptions, pulseDetailsFor } from "@/domain/options";
import type { Journey, PreferenceProfile } from "@/types";
import { PREFERENCE_PROFILES } from "@/types";

const NOW = new Date("2026-10-26T08:30:00.000+08:00").getTime();
const provider = createMockDataProvider();
const nameOf = (id: string) => demoStations.find((s) => s.id === id)?.name ?? id;

function pulse(scenario: boolean) {
  const seeds = [...buildSeededReports(NOW), ...(scenario ? buildScenarioReports(NOW) : [])];
  return pulseDetailsFor(
    demoStations.map((s) => s.id),
    (id) => seeds.filter((r) => r.stationId === id),
    NOW,
  );
}

function build(scenario: boolean, profile: PreferenceProfile) {
  return buildJourneyOptions({
    network: provider.getMultimodalNetwork({ includeScenarioServices: scenario }),
    coreNetwork: provider.getNetwork(),
    originId: DEMO_ORIGIN_ID,
    destinationId: DEMO_DESTINATION_ID,
    disruptions: scenario ? [demoDisruption] : [],
    pulseByStation: pulse(scenario),
    fareRules: provider.getFareRules(),
    profile,
    stationName: nameOf,
  });
}

function minimal(id: string, t: number, x: number, w: number, extra: Partial<Journey> = {}): Journey {
  return {
    id,
    legs: [],
    totalTimeMin: t,
    transfers: x,
    totalWalkMeters: w,
    sourceStatus: "SCHEDULED",
    isSimulated: false,
    ...extra,
  };
}

describe("Fare_Engine (Req 14)", () => {
  it("prices the baseline at RM4.20 as one integrated rail fare, labelled ESTIMATED", () => {
    const plan = planJourney(provider, DEMO_ORIGIN_ID, DEMO_DESTINATION_ID);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const fare = computeJourneyFare(plan.journey, demoNetwork, provider.getFareRules());
    expect(fare.totalSen).toBe(420);
    expect(fare.items).toHaveLength(1);
    expect(fare.items[0].legIndexes).toEqual([0, 1]);
    expect(fare.sourceStatus).toBe("ESTIMATED");
    expect(fare.isSimulated).toBe(false);
  });

  it("prices Alt A at RM4.40 and Alt B at RM4.20", () => {
    const rec = findRecoveryOnNetwork(demoNetwork, DEMO_ORIGIN_ID, DEMO_DESTINATION_ID, [demoDisruption]);
    expect(rec.ok).toBe(true);
    if (!rec.ok) return;
    const a = rec.alternatives.find((j) => j.totalTimeMin === 34)!;
    const b = rec.alternatives.find((j) => j.totalTimeMin === 41)!;
    expect(computeJourneyFare(a, demoNetwork, provider.getFareRules()).totalSen).toBe(440);
    expect(computeJourneyFare(b, demoNetwork, provider.getFareRules()).totalSen).toBe(420);
  });
});

describe("Ranking_Engine extension (Req 16)", () => {
  it("keeps the MVP order when fare/crowd/access are absent", () => {
    const a = minimal("alt-a", 34, 2, 520);
    const b = minimal("alt-b", 41, 2, 260);
    expect(rankAlternatives([a, b], "Balanced")[0].id).toBe("alt-a");
    expect(rankAlternatives([a, b], "Fastest")[0].id).toBe("alt-a");
    expect(rankAlternatives([a, b], "Least Walking")[0].id).toBe("alt-b");
  });

  it("supports the new profiles deterministically", () => {
    const cheap = minimal("cheap", 43, 1, 900, { fareSen: 340, crowdLevel: 2 });
    const calm = minimal("calm", 41, 2, 260, { fareSen: 420, crowdLevel: 1 });
    const fast = minimal("fast", 34, 2, 520, { fareSen: 440, crowdLevel: 2 });
    const set = [cheap, calm, fast];
    expect(rankAlternatives(set, "Cheapest")[0].id).toBe("cheap");
    expect(rankAlternatives(set, "Avoid Crowding")[0].id).toBe("calm");
    expect(rankAlternatives(set, "Accessible")[0].id).toBe("calm");
    expect(rankAlternatives(set, "Fastest")[0].id).toBe("fast");
  });
});

describe("Journey_Options_Engine — normal day (Req 15, 21)", () => {
  const result = build(false, "Balanced");

  it("presents the baseline as recommended plus the direct-and-walk option", () => {
    expect(result.mode).toBe("normal");
    expect(result.options.map((o) => o.title)).toEqual([
      "via Ampang Park",
      "Putrajaya Line + walk",
    ]);
    const [n, d] = result.options;
    expect([n.journey.totalTimeMin, n.journey.transfers, n.journey.totalWalkMeters, n.fare.totalSen]).toEqual([28, 1, 180, 420]);
    expect([d.journey.totalTimeMin, d.journey.transfers, d.journey.totalWalkMeters, d.fare.totalSen]).toEqual([29, 0, 700, 380]);
    expect(n.strategies).toEqual(expect.arrayContaining(["Fastest", "Least walking"]));
    expect(d.strategies).toEqual(expect.arrayContaining(["Fewest changes", "Cheapest"]));
    expect(result.rideHail).toBeNull();
  });

  it("labels the walk leg as an estimate and assigns unique ids", () => {
    const d = result.options[1];
    const walk = d.journey.legs.find((l) => l.legKind === "walk")!;
    expect(walk.sourceStatus).toBe("ESTIMATED");
    expect(new Set(result.candidates.map((c) => c.id)).size).toBe(result.candidates.length);
  });
});

describe("Journey_Options_Engine — recovery (Req 18, 22, 23)", () => {
  const result = build(true, "Balanced");
  const byTitle = (t: string) => result.options.find((o) => o.title === t);

  it("recommends via TRX + Pasar Seni under Balanced, with meaningful alternatives", () => {
    expect(result.mode).toBe("recovery");
    expect(result.options[0].title).toBe("via TRX + Pasar Seni");
    expect(result.options.map((o) => o.title).sort()).toEqual(
      ["via Chan Sow Lin + Masjid Jamek", "via TRX + Pasar Seni", "via replacement bus from TRX"].sort(),
    );
    const a = byTitle("via TRX + Pasar Seni")!;
    const b = byTitle("via Chan Sow Lin + Masjid Jamek")!;
    const s = byTitle("via replacement bus from TRX")!;
    expect([a.journey.totalTimeMin, a.journey.transfers, a.journey.totalWalkMeters, a.fare.totalSen]).toEqual([34, 2, 520, 440]);
    expect([b.journey.totalTimeMin, b.journey.transfers, b.journey.totalWalkMeters, b.fare.totalSen]).toEqual([41, 2, 260, 420]);
    expect([s.journey.totalTimeMin, s.journey.transfers, s.journey.totalWalkMeters, s.fare.totalSen]).toEqual([43, 1, 900, 340]);
    expect(a.strategies).toContain("Fastest");
    expect(b.strategies).toEqual(expect.arrayContaining(["Least walking", "Least crowded"]));
    expect(s.strategies).toEqual(expect.arrayContaining(["Fewest changes", "Cheapest"]));
    expect(a.confidence.band).toBe("Medium");
  });

  it("marks the replacement bus as simulated and unverified", () => {
    const s = byTitle("via replacement bus from TRX")!;
    expect(s.isSimulated).toBe(true);
    const busLeg = s.journey.legs.find((l) => l.mode === "Replacement Bus")!;
    expect(busLeg.isSimulated).toBe(true);
    expect(busLeg.sourceStatus).toBe("UNVERIFIED");
  });

  it("never presents an option that traverses the blocked TRX→Conlay Putrajaya hop", () => {
    const net = provider.getMultimodalNetwork({ includeScenarioServices: true });
    for (const o of result.candidates) {
      const hops = journeySegments(o.journey, net);
      expect(
        hops.some((h) => h.from === STATION_IDS.trx && h.to === STATION_IDS.conlay && h.lineId === LINE_IDS.putrajaya),
      ).toBe(false);
    }
  });

  it("hides the dominated bus 300 variant but keeps it as a candidate", () => {
    const bus = result.candidates.find((c) => c.title === "via Chan Sow Lin + bus 300 from Masjid Jamek");
    expect(bus).toBeDefined();
    expect(result.options.some((o) => o.id === bus!.id)).toBe(false);
  });

  it("re-ranks heroes per profile as designed", () => {
    const hero = (p: PreferenceProfile) => build(true, p).options[0].title;
    expect(hero("Fastest")).toBe("via TRX + Pasar Seni");
    expect(hero("Least Walking")).toBe("via Chan Sow Lin + Masjid Jamek");
    expect(hero("Avoid Crowding")).toBe("via Chan Sow Lin + Masjid Jamek");
    expect(hero("Accessible")).toBe("via Chan Sow Lin + Masjid Jamek");
    expect(hero("Cheapest")).toBe("via replacement bus from TRX");
    expect(hero("Fewest Transfers")).toBe("via replacement bus from TRX");
    for (const p of PREFERENCE_PROFILES) expect(build(true, p).options.length).toBeGreaterThanOrEqual(2);
  });

  it("estimates a separate rail + ride-hail fallback from TRX", () => {
    const rh = result.rideHail!;
    expect(rh).not.toBeNull();
    expect(rh.hailStationId).toBe(STATION_IDS.trx);
    expect(rh.sourceStatus).toBe("ESTIMATED");
    expect(rh.totalMinRange[0]).toBeLessThan(34);
    expect(rh.totalCostSenRange[0]).toBeGreaterThan(440);
    expect(rh.railFareSen).toBe(340);
  });
});
