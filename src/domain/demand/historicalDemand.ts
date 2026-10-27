/**
 * Historical demand — pure, explainable demand bands (Requirement 27).
 *
 * Bands come from the station's percentile rank of average weekday tap-in +
 * tap-out trips in the official OD dataset: ≥ 0.85 HIGH, ≥ 0.40 MEDIUM, else
 * LOW. Always `sourceStatus = "HISTORICAL"`, never live. No ML.
 */

import type {
  DemandBand,
  HistoricalDemand,
  HistoricalDemandDataset,
} from "@/types";

export const HIGH_DEMAND_PERCENTILE = 0.85;
export const MEDIUM_DEMAND_PERCENTILE = 0.4;

export function demandBand(percentile: number): DemandBand {
  if (percentile >= HIGH_DEMAND_PERCENTILE) return "HIGH";
  if (percentile >= MEDIUM_DEMAND_PERCENTILE) return "MEDIUM";
  return "LOW";
}

/** Historical demand for a station, or null when the dataset has no record. */
export function historicalDemandFor(
  dataset: HistoricalDemandDataset,
  stationId: string,
): HistoricalDemand | null {
  const record = dataset.records.find((r) => r.stationId === stationId);
  if (!record) return null;
  return {
    stationId,
    band: demandBand(record.percentile),
    record,
    sourceStatus: "HISTORICAL",
    isSimulated: false,
  };
}

/** One-line plain explanation for passengers. */
export function describeDemand(d: HistoricalDemand): string {
  const { record } = d;
  const trips = record.avgWeekdayTrips.toLocaleString("en-MY");
  if (d.band === "HIGH") {
    return `One of the busiest stations on the network — about ${trips} trips start or end here on an average weekday (#${record.rank} of ${record.of}).`;
  }
  if (d.band === "MEDIUM") {
    return `Moderately busy — about ${trips} trips start or end here on an average weekday (#${record.rank} of ${record.of}).`;
  }
  return `Usually quieter — about ${trips} trips start or end here on an average weekday (#${record.rank} of ${record.of}).`;
}
