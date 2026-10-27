/**
 * Focused unit tests — recovery avoids TRX–Conlay (Requirement 5.2, with 5.1).
 *
 * Asserts the demo recovery produces ≥2 alternatives, that each one avoids the
 * blocked TRX→Conlay Putrajaya Line hop, and that Alt A (34/2/520 via Pasar
 * Seni) and Alt B (41/2/260 via Masjid Jamek) are both present.
 */
import { describe, it, expect } from "vitest";
import {
  findRecoveryOnNetwork,
  computeBlockedSegments,
  journeyAvoidsBlocked,
  journeySegments,
} from "@/domain/recovery";
import {
  demoNetwork,
  demoDisruption,
  STATION_IDS,
  LINE_IDS,
  DEMO_ORIGIN_ID,
  DEMO_DESTINATION_ID,
} from "@/data";

describe("Recovery_Engine — alternatives avoid TRX–Conlay (Req 5.1, 5.2)", () => {
  const result = findRecoveryOnNetwork(
    demoNetwork,
    DEMO_ORIGIN_ID,
    DEMO_DESTINATION_ID,
    [demoDisruption],
  );

  it("returns ok with at least two alternatives", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alternatives.length).toBeGreaterThanOrEqual(2);
  });

  it("every alternative avoids the blocked TRX→Conlay hop", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const blocked = computeBlockedSegments([demoDisruption], demoNetwork);

    for (const alt of result.alternatives) {
      // High-level: passes the avoid-predicate.
      expect(journeyAvoidsBlocked(alt, blocked, demoNetwork)).toBe(true);
      // Concrete: no expanded hop is the TRX→Conlay Putrajaya Line segment.
      const traversesBlock = journeySegments(alt, demoNetwork).some(
        (hop) =>
          hop.from === STATION_IDS.trx &&
          hop.to === STATION_IDS.conlay &&
          hop.lineId === LINE_IDS.putrajaya,
      );
      expect(traversesBlock).toBe(false);
    }
  });

  it("includes Alt A (34/2/520 via Pasar Seni) and Alt B (41/2/260 via Masjid Jamek)", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const alts = result.alternatives;

    const altA = alts.find((a) => a.totalTimeMin === 34);
    const altB = alts.find((a) => a.totalTimeMin === 41);

    expect(altA).toBeDefined();
    expect(altB).toBeDefined();
    if (!altA || !altB) return;

    // Alt A: 34 min, 2 transfers, 520 m, routed via Pasar Seni.
    expect(altA.transfers).toBe(2);
    expect(altA.totalWalkMeters).toBe(520);
    expect(altA.legs.some((l) => l.from === STATION_IDS.pasarSeni || l.to === STATION_IDS.pasarSeni)).toBe(true);

    // Alt B: 41 min, 2 transfers, 260 m, routed via Masjid Jamek.
    expect(altB.transfers).toBe(2);
    expect(altB.totalWalkMeters).toBe(260);
    expect(altB.legs.some((l) => l.from === STATION_IDS.masjidJamek || l.to === STATION_IDS.masjidJamek)).toBe(true);
  });
});
