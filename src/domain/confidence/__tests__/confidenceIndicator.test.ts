/**
 * Focused unit tests — confidence boundaries & calculation (Requirement 6.4).
 *
 * Asserts the band boundaries (75/74 and 50/49), that factors always sum to the
 * clamped score (including a clamp case), and that a demo recovery alternative
 * yields score 56 / Medium.
 */
import { describe, it, expect } from "vitest";
import { computeConfidence, scoreToBand } from "@/domain/confidence";
import type { Journey, JourneyLeg } from "@/types";

/** Build a journey with N legs of a given sourceStatus. */
function journeyWith(opts: {
  transfers?: number;
  isSimulated?: boolean;
  journeyStatus?: Journey["sourceStatus"];
  legStatuses?: JourneyLeg["sourceStatus"][];
}): Journey {
  const transfers = opts.transfers ?? 1;
  const legStatuses = opts.legStatuses ?? ["SCHEDULED", "SCHEDULED"];
  const legs: JourneyLeg[] = legStatuses.map((s, i) => ({
    from: `s${i}`,
    to: `s${i + 1}`,
    mode: "MRT",
    line: "Line",
    travelTimeMin: 10,
    walkMeters: 0,
    sourceStatus: s,
    isSimulated: opts.isSimulated ?? false,
  }));
  return {
    id: "conf-journey",
    legs,
    totalTimeMin: 30,
    transfers,
    totalWalkMeters: 100,
    sourceStatus: opts.journeyStatus ?? "SCHEDULED",
    isSimulated: opts.isSimulated ?? false,
  };
}

describe("Confidence_Indicator — band boundaries (Req 6.4)", () => {
  it("maps scores to bands at the exact thresholds", () => {
    expect(scoreToBand(75)).toBe("High");
    expect(scoreToBand(74)).toBe("Medium");
    expect(scoreToBand(50)).toBe("Medium");
    expect(scoreToBand(49)).toBe("Low");
  });
});

describe("Confidence_Indicator — factors sum to clamped score (Req 6.4)", () => {
  it("factors sum to the score in the normal (unclamped) case", () => {
    // Base 60 + SCHEDULED 5 − scheduled-where-live 5 − 0 extra transfers = 60.
    const result = computeConfidence(journeyWith({ transfers: 1 }));
    const sum = result.factors.reduce((a, f) => a + f.delta, 0);
    expect(sum).toBe(result.score);
    expect(result.score).toBe(60);
    expect(result.band).toBe("Medium");
  });

  it("factors sum to the score in a clamped case (raw < 0 → clamped to 0)", () => {
    // Base 60 − unverified 20 − simulated/mixed 8 − packed pulse 10
    //   − many extra transfers (7 → 6 beyond first → −24) = −2 raw → clamp to 0.
    const journey = journeyWith({
      transfers: 7,
      isSimulated: true,
      journeyStatus: "UNVERIFIED",
      legStatuses: ["UNVERIFIED", "UNVERIFIED"],
    });
    const result = computeConfidence(journey, {
      hasPackedOrSeverePulse: true,
    });
    const sum = result.factors.reduce((a, f) => a + f.delta, 0);
    // Σ factors must equal the clamped score, and score is clamped to 0.
    expect(sum).toBe(result.score);
    expect(result.score).toBe(0);
    expect(result.band).toBe("Low");
    // The clamp adjustment factor is present because raw dropped below 0.
    expect(result.factors.some((f) => f.label === "Clamped to valid range")).toBe(true);
  });
});

describe("Confidence_Indicator — demo recovery alternative (Req 6.4)", () => {
  it("a 2-transfer SCHEDULED recovery alternative scores 56 / Medium", () => {
    // Mirrors Alt A/B: SCHEDULED journey, all legs SCHEDULED, 2 transfers,
    // not simulated, no pulse context.
    // Base 60 + SCHEDULED 5 − scheduled-where-live 5 − 1 extra transfer 4 = 56.
    const alt = journeyWith({
      transfers: 2,
      journeyStatus: "SCHEDULED",
      legStatuses: ["SCHEDULED", "SCHEDULED", "SCHEDULED"],
    });
    const result = computeConfidence(alt);

    expect(result.score).toBe(56);
    expect(result.band).toBe("Medium");
    const sum = result.factors.reduce((a, f) => a + f.delta, 0);
    expect(sum).toBe(56);
  });
});
