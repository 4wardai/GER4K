/**
 * Station_Image_Reference_Model (NEW) — a SMALL curated set of approved station
 * reference photos (Requirement 27). Each entry is an app-local asset path plus
 * REQUIRED source/attribution metadata. We deliberately start with only a few
 * demo stations; GER4K must never scrape or present an arbitrary internet image
 * as an authoritative reference.
 *
 * NOTE: asset files live under `public/stations/`. An entry is only usable at
 * runtime if its asset exists; the VisualTool treats a missing/empty entry as
 * "no approved photo yet".
 */
import { STATION_IDS } from "@/data";

export interface StationImageReference {
  stationId: string;
  stationName: string;
  /** App-local path under /public. Empty string => curated slot not yet filled. */
  imageUrl: string;
  attribution: string;
  sourceUrl?: string;
}

/**
 * Curated references. Image assets are added to `public/stations/` when an
 * approved, correctly-licensed source is available. Until an asset is dropped
 * in, `imageUrl` stays empty and Gerak Khas answers honestly that it has no
 * real reference photo yet (and offers an illustration instead).
 */
export const STATION_IMAGE_REFERENCES: StationImageReference[] = [
  {
    stationId: STATION_IDS.putrajayaSentral,
    stationName: "Putrajaya Sentral",
    imageUrl: "",
    attribution: "Pending approved source",
  },
  {
    stationId: STATION_IDS.trx,
    stationName: "TRX",
    imageUrl: "",
    attribution: "Pending approved source",
  },
  {
    stationId: STATION_IDS.pasarSeni,
    stationName: "Pasar Seni",
    imageUrl: "",
    attribution: "Pending approved source",
  },
  {
    stationId: STATION_IDS.klcc,
    stationName: "KLCC",
    imageUrl: "",
    attribution: "Pending approved source",
  },
];

/** The curated reference for a station, only when it has a usable asset. */
export function referenceFor(stationId: string): StationImageReference | null {
  const ref = STATION_IMAGE_REFERENCES.find((r) => r.stationId === stationId);
  if (!ref || !ref.imageUrl) return null;
  return ref;
}
