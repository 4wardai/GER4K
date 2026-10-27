/**
 * Focused unit tests — deterministic preference ranking (Requirement 6.1, 6.3).
 *
 * Builds the demo Alt A (34/2/520) and Alt B (41/2/260) as minimal journeys and
 * asserts Fastest ranks A first, Least Walking ranks B first, ranking is
 * deterministic, and the defined tie-break (shortest travelTime, then id)
 * applies for a constructed tie.
 */
import { describe, it, expect } from "vitest";
import { rankAlternatives } from "@/domain/recovery";
import type { Journey } from "@/types";

/** Minimal journey builder — only the attributes ranking reads matter. */
function journey(
  id: string,
  totalTimeMin: number,
  transfers: number,
  totalWalkMeters: number,
): Journey {
  return {
    id,
    legs: [],
    totalTimeMin,
    transfers,
    totalWalkMeters,
    sourceStatus: "SCHEDULED",
    isSimulated: false,
  };
}

const altA = journey("alt-a", 34, 2, 520); // faster, more walking
const altB = journey("alt-b", 41, 2, 260); // slower, less walking

describe("Ranking_Engine — deterministic preference ranking (Req 6.1, 6.3)", () => {
  it("Fastest ranks Alt A first (34 < 41)", () => {
    const ranked = rankAlternatives([altA, altB], "Fastest");
    expect(ranked[0].id).toBe("alt-a");
  });

  it("Least Walking ranks Alt B first (260 < 520)", () => {
    const ranked = rankAlternatives([altA, altB], "Least Walking");
    expect(ranked[0].id).toBe("alt-b");
  });

  it("is deterministic — same input always yields the same order", () => {
    const first = rankAlternatives([altA, altB], "Fastest").map((j) => j.id);
    const second = rankAlternatives([altA, altB], "Fastest").map((j) => j.id);
    // Input order independence too: reversing the input yields the same ranking.
    const reversed = rankAlternatives([altB, altA], "Fastest").map((j) => j.id);

    expect(first).toEqual(second);
    expect(reversed).toEqual(first);
  });

  it("applies the defined tie-break: shortest travelTime then stable id", () => {
    // Two journeys with identical attributes → equal cost under any profile.
    // Tie-break 1 (travelTime) is also equal, so tie-break 2 (id asc) decides.
    const tieHigh = journey("z-journey", 30, 1, 100);
    const tieLow = journey("a-journey", 30, 1, 100);

    const ranked = rankAlternatives([tieHigh, tieLow], "Balanced");
    expect(ranked.map((j) => j.id)).toEqual(["a-journey", "z-journey"]);

    // When costs tie but travel times differ, the faster one wins the tie-break.
    const faster = journey("faster", 20, 1, 50);
    const slower = journey("slower", 25, 1, 50);
    // Under Fewest Transfers both share transfers (constant → 0 contribution)
    // and walk is constant too, so cost ties; travelTime breaks it → faster first.
    const byTime = rankAlternatives([slower, faster], "Fewest Transfers");
    expect(byTime[0].id).toBe("faster");
  });
});
