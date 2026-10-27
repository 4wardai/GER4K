/**
 * Focused unit tests — new reports start UNVERIFIED (Requirement 9.2).
 *
 * A freshly submitted community report starts sourceStatus "UNVERIFIED" and
 * isSimulated false (no auto-promotion to COMMUNITY_REPORTED), and it appears in
 * getReports() for that station.
 */
import { describe, it, expect } from "vitest";
import { createMockDataProvider, STATION_IDS } from "@/data";

describe("MockDataProvider.submitReport — new report lifecycle (Req 9.2)", () => {
  it("returns an UNVERIFIED, non-simulated report and surfaces it in getReports", () => {
    const provider = createMockDataProvider();

    const stored = provider.submitReport({
      stationId: STATION_IDS.klcc,
      condition: "Busy",
    });

    expect(stored.sourceStatus).toBe("UNVERIFIED");
    expect(stored.isSimulated).toBe(false);
    expect(stored.stationId).toBe(STATION_IDS.klcc);
    expect(stored.condition).toBe("Busy");

    // The submitted report is retrievable for that station.
    const reports = provider.getReports(STATION_IDS.klcc);
    expect(reports.some((r) => r.id === stored.id)).toBe(true);
  });
});
