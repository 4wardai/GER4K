/**
 * Focused unit tests — disruption detection (Requirement 3.1, with 3.3).
 *
 * Asserts the demo TRX–Conlay Putrajaya Line disruption marks the baseline
 * journey's leg 0 affected, and that a journey with no disruptions is reported
 * not affected.
 */
import { describe, it, expect } from "vitest";
import { planJourney } from "@/domain/transport";
import { evaluateImpact } from "@/domain/disruption";
import {
  createMockDataProvider,
  demoNetwork,
  demoDisruption,
  DEMO_ORIGIN_ID,
  DEMO_DESTINATION_ID,
} from "@/data";

describe("Disruption_Monitor — impact detection (Req 3.1, 3.3)", () => {
  const provider = createMockDataProvider();
  const planned = planJourney(provider, DEMO_ORIGIN_ID, DEMO_DESTINATION_ID);
  if (!planned.ok) throw new Error("expected baseline journey to plan");
  const baseline = planned.journey;

  it("marks the baseline journey affected on leg 0 for the demo TRX–Conlay disruption", () => {
    const impact = evaluateImpact(baseline, [demoDisruption], demoNetwork);

    expect(impact.affected).toBe(true);
    expect(impact.affectedLegIndexes).toEqual([0]);
  });

  it("reports not affected when there are no disruptions", () => {
    const impact = evaluateImpact(baseline, [], demoNetwork);

    expect(impact.affected).toBe(false);
    expect(impact.affectedLegIndexes).toEqual([]);
  });
});
