/**
 * Focused unit tests — normal journey generation (Requirements 1.1, 1.2).
 *
 * Asserts the baseline Putrajaya Sentral → KLCC plan against the corrected demo
 * fixture ONLY: 2 legs, 28 min, 1 transfer, 180 m walk, Putrajaya Line then
 * Kelana Jaya Line, every leg SCHEDULED / not simulated.
 */
import { describe, it, expect } from "vitest";
import { planJourney } from "@/domain/transport";
import {
  createMockDataProvider,
  DEMO_ORIGIN_ID,
  DEMO_DESTINATION_ID,
  STATION_IDS,
} from "@/data";

describe("Journey_Planner — normal baseline journey (Req 1.1, 1.2)", () => {
  it("plans the baseline Putrajaya Sentral → KLCC journey with the documented totals and legs", () => {
    const provider = createMockDataProvider();

    const result = planJourney(provider, DEMO_ORIGIN_ID, DEMO_DESTINATION_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return; // narrow for TS

    const { journey } = result;

    // Totals (fixture source of truth: 28 / 1 / 180).
    expect(journey.totalTimeMin).toBe(28);
    expect(journey.transfers).toBe(1);
    expect(journey.totalWalkMeters).toBe(180);

    // Exactly two legs: Putrajaya Line then Kelana Jaya Line.
    expect(journey.legs).toHaveLength(2);

    const [leg0, leg1] = journey.legs;
    expect(leg0.line).toBe("Putrajaya Line");
    expect(leg0.from).toBe(STATION_IDS.putrajayaSentral);
    expect(leg0.to).toBe(STATION_IDS.ampangPark);

    expect(leg1.line).toBe("Kelana Jaya Line");
    expect(leg1.from).toBe(STATION_IDS.ampangPark);
    expect(leg1.to).toBe(STATION_IDS.klcc);

    // Every leg + the journey are SCHEDULED, not simulated (Req 2 labelling).
    for (const leg of journey.legs) {
      expect(leg.sourceStatus).toBe("SCHEDULED");
      expect(leg.isSimulated).toBe(false);
    }
    expect(journey.sourceStatus).toBe("SCHEDULED");
    expect(journey.isSimulated).toBe(false);
  });
});
