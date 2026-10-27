import type { Disruption } from "@/types";
import { lineInfoFor } from "@/components/transit/lineStyle";

/**
 * Short disruption note for Ask GER4K, e.g. "Simulated severe disruption on
 * the Putrajaya Line between TRX and Conlay". Undefined when there is none.
 */
export function deriveDisruptionSummary(
  disruptions: ReadonlyArray<Disruption>,
  stationName: (id: string) => string,
): string | undefined {
  const d = disruptions[0];
  if (!d) return undefined;
  const line = lineInfoFor(d.affectedSegment.line)?.name ?? d.affectedSegment.line ?? "rail";
  return `${d.isSimulated ? "Simulated " : ""}${d.severity.toLowerCase()} on the ${line} between ${stationName(
    d.affectedSegment.from,
  )} and ${stationName(d.affectedSegment.to)}`;
}
