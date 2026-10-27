/**
 * Historical demand fixture (Full Vision, Requirement 27) — HISTORICAL data.
 *
 * Extracted at DEVELOPMENT time from the official data.gov.my dataset
 * "Daily Origin-Destination Ridership: Rapid Rail (KV)"
 * (`ridership_od_rapidrail_daily`, 2026 parquet, CC BY 4.0, source: Prasarana
 * Malaysia / Ministry of Transport) by `scripts/data/extract_od_demand.py`.
 *
 * Measure: average weekday trips that START or END at the station (tap-in +
 * tap-out), merging the station's line codes, over the last 20 weekdays of the
 * window. Rank/percentile are across all 154 named stations in that window.
 *
 * Caveat: tap-in/tap-out data does not include passengers changing lines inside
 * the paid area, so interchange demand is understated.
 *
 * This is NOT live crowding and is never presented as such.
 */

import type { HistoricalDemandDataset } from "@/types";
import { STATION_IDS } from "./fixture";

export const historicalDemandDataset: HistoricalDemandDataset = {
  source: "data.gov.my — Daily Origin-Destination Ridership: Rapid Rail (KV)",
  sourceUrl: "https://data.gov.my/data-catalogue/ridership_od_rapidrail_daily",
  license: "CC BY 4.0 (Prasarana Malaysia, Ministry of Transport)",
  window: ["2026-09-28", "2026-10-25"],
  weekdays: 20,
  measure: "Average weekday trips starting or ending at the station",
  records: [
    { stationId: STATION_IDS.bukitBintang, datasetName: "Bukit Bintang", avgWeekdayTrips: 71839, rank: 1, of: 154, percentile: 1.0 },
    { stationId: STATION_IDS.klcc, datasetName: "KLCC", avgWeekdayTrips: 45708, rank: 3, of: 154, percentile: 0.99 },
    { stationId: STATION_IDS.trx, datasetName: "Tun Razak Exchange", avgWeekdayTrips: 41037, rank: 5, of: 154, percentile: 0.97 },
    { stationId: STATION_IDS.ampangPark, datasetName: "Ampang Park", avgWeekdayTrips: 37373, rank: 6, of: 154, percentile: 0.97 },
    { stationId: STATION_IDS.pasarSeni, datasetName: "Pasar Seni", avgWeekdayTrips: 33700, rank: 8, of: 154, percentile: 0.95 },
    { stationId: STATION_IDS.masjidJamek, datasetName: "Masjid Jamek", avgWeekdayTrips: 33576, rank: 9, of: 154, percentile: 0.95 },
    { stationId: STATION_IDS.merdeka, datasetName: "Merdeka", avgWeekdayTrips: 8368, rank: 55, of: 154, percentile: 0.65 },
    { stationId: STATION_IDS.persiaranKlcc, datasetName: "Persiaran KLCC", avgWeekdayTrips: 6452, rank: 73, of: 154, percentile: 0.53 },
    { stationId: STATION_IDS.chanSowLin, datasetName: "Chan Sow Lin", avgWeekdayTrips: 5027, rank: 88, of: 154, percentile: 0.43 },
    { stationId: STATION_IDS.putrajayaSentral, datasetName: "Putrajaya Sentral", avgWeekdayTrips: 3492, rank: 103, of: 154, percentile: 0.33 },
    { stationId: STATION_IDS.conlay, datasetName: "Conlay", avgWeekdayTrips: 2549, rank: 117, of: 154, percentile: 0.24 },
  ],
};
