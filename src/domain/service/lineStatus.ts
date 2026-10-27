/**
 * Line status — pure derivation of Service-screen status (Requirement 26).
 *
 *  - "Disrupted" when an active disruption sits on the line. The status carries
 *    the DISRUPTION's labels (the demo disruption is simulated + unverified, so
 *    the line status is too — never operator-confirmed).
 *  - Otherwise "Normal" from the prototype's demo status feed:
 *    `sourceStatus = "SCHEDULED"` (running to timetable as far as GER4K knows),
 *    `isSimulated = true` (no live operator status feed is connected).
 *  - Community notes (Packed / Severe Pulse on the line's stations) are listed
 *    separately and never change the status value.
 */

import type {
  Disruption,
  LineInfo,
  LineStatus,
  PulseSummary,
  TransportNetwork,
} from "@/types";

function resolveLineId(ref: string | undefined, network: TransportNetwork): string | undefined {
  if (!ref) return undefined;
  return (
    network.lines.find((l) => l.id === ref)?.id ??
    network.lines.find((l) => l.name === ref)?.id
  );
}

export function deriveLineStatuses(
  lines: ReadonlyArray<LineInfo>,
  network: TransportNetwork,
  activeDisruptions: ReadonlyArray<Disruption>,
  pulseByStation: ReadonlyMap<string, PulseSummary>,
  stationName: (id: string) => string,
): LineStatus[] {
  return lines.map((info) => {
    const networkLine = network.lines.find((l) => l.id === info.lineId);
    const stationIds = networkLine?.stationIds ?? info.realOrder;

    const communityNotes = stationIds
      .map((id) => ({ id, summary: pulseByStation.get(id) }))
      .filter(
        (x): x is { id: string; summary: PulseSummary } =>
          !!x.summary &&
          x.summary.reportCount > 0 &&
          (x.summary.condition === "Packed" || x.summary.condition === "Severe disruption"),
      )
      .map((x) => ({ stationId: x.id, condition: x.summary.condition }));

    const disruption = activeDisruptions.find(
      (d) => resolveLineId(d.affectedSegment.line, network) === info.lineId,
    );

    if (disruption) {
      const { from, to } = disruption.affectedSegment;
      return {
        lineId: info.lineId,
        status: "Disrupted",
        notice: `Service disrupted between ${stationName(from)} and ${stationName(to)}`,
        affectedStationIds: [from, to],
        communityNotes,
        sourceStatus: disruption.sourceStatus,
        isSimulated: disruption.isSimulated,
      };
    }

    return {
      lineId: info.lineId,
      status: "Normal",
      notice: null,
      affectedStationIds: [],
      communityNotes,
      sourceStatus: "SCHEDULED",
      isSimulated: true,
    };
  });
}
