/**
 * Focused unit tests — Pulse aggregation (Requirement 7.1, with 7.2/7.4).
 *
 * Deterministic: a FIXED `now` is used and reports carry timestamps built
 * relative to it (no reliance on wall-clock). Asserts TRX → Packed/High/3,
 * Chan Sow Lin → Busy/Medium, empty → Normal/Low/0/null, and the cautious
 * tie-break (equal weighted Busy vs Packed → Packed).
 */
import { describe, it, expect } from "vitest";
import { aggregatePulse } from "@/domain/community";
import { STATION_IDS } from "@/data";
import type { CommunityReport, StationCondition } from "@/types";

/** Fixed reference "now" so every age is deterministic. */
const NOW = new Date("2024-01-01T12:00:00.000Z");

/** Build a report whose timestamp is `minutesAgo` before the fixed NOW. */
function report(
  id: string,
  stationId: string,
  condition: StationCondition,
  minutesAgo: number,
): CommunityReport {
  return {
    id,
    stationId,
    condition,
    timestamp: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString(),
    sourceStatus: "COMMUNITY_REPORTED",
    isSimulated: true,
  };
}

describe("Pulse_Aggregator — aggregation (Req 7.1, 7.2, 7.4)", () => {
  it("TRX with 3 recent Packed reports → Packed / High / count 3", () => {
    const reports = [
      report("trx-1", STATION_IDS.trx, "Packed", 2),
      report("trx-2", STATION_IDS.trx, "Packed", 5),
      report("trx-3", STATION_IDS.trx, "Packed", 8),
    ];

    const summary = aggregatePulse(STATION_IDS.trx, reports, NOW);

    expect(summary.condition).toBe("Packed");
    expect(summary.confidence.band).toBe("High");
    expect(summary.reportCount).toBe(3);
    expect(summary.stationId).toBe(STATION_IDS.trx);
  });

  it("Chan Sow Lin with a single recent Busy report → Busy / Medium", () => {
    const reports = [report("csl-1", STATION_IDS.chanSowLin, "Busy", 6)];

    const summary = aggregatePulse(STATION_IDS.chanSowLin, reports, NOW);

    expect(summary.condition).toBe("Busy");
    expect(summary.confidence.band).toBe("Medium");
    expect(summary.reportCount).toBe(1);
  });

  it("no reports → Normal / Low / count 0 / mostRecentAt null", () => {
    const summary = aggregatePulse(STATION_IDS.pasarSeni, [], NOW);

    expect(summary.condition).toBe("Normal");
    expect(summary.confidence.band).toBe("Low");
    expect(summary.reportCount).toBe(0);
    expect(summary.mostRecentAt).toBeNull();
  });

  it("cautious tie-break — equal weighted Busy vs Packed resolves to Packed", () => {
    // Both reports in the 10–30 min single-weight window (weight 1 each), so
    // Busy and Packed tie at weighted support 1 → cautious tie-break → Packed.
    const reports = [
      report("tie-busy", STATION_IDS.trx, "Busy", 20),
      report("tie-packed", STATION_IDS.trx, "Packed", 20),
    ];

    const summary = aggregatePulse(STATION_IDS.trx, reports, NOW);

    expect(summary.condition).toBe("Packed");
  });
});
