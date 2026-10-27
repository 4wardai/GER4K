/**
 * VisualTool (NEW, Requirement 27) — resolves a station visual. Image
 * provenance is a `visualType` ONLY; it never carries a transport
 * `sourceStatus`/`isSimulated`.
 *
 *  - REAL_REFERENCE  — a curated, approved station photo WITH attribution.
 *  - AI_GENERATED    — a clearly-labelled illustration ("NOT AN ACTUAL STATION
 *                      PHOTO"), produced server-side.
 * A real reference is always preferred; when none exists the tool returns the
 * exact "no real reference photo yet" message so the UI can offer to generate.
 */
import { stationName } from "@/components/state/useLiveData";
import {
  AI_GENERATED_LABEL,
  REAL_REFERENCE_LABEL,
  type VisualResult,
} from "../types";
import { referenceFor } from "./stationImageReference";

export const NO_REAL_PHOTO = "I don't have a real reference photo for this station yet.";
export const IMAGE_FALLBACK =
  "I couldn't generate the illustration right now, but I can still show the station information I have.";

/** Resolve the REAL reference for a station, or an honest "no photo" result. */
export function resolveRealVisual(stationId: string): VisualResult {
  const ref = referenceFor(stationId);
  const name = ref?.stationName ?? stationName(stationId);
  if (!ref) {
    return {
      visualType: "REAL_REFERENCE",
      stationId,
      stationName: name,
      label: REAL_REFERENCE_LABEL,
      unavailableMessage: NO_REAL_PHOTO,
    };
  }
  return {
    visualType: "REAL_REFERENCE",
    stationId,
    stationName: name,
    imageUrl: ref.imageUrl,
    label: REAL_REFERENCE_LABEL,
    sourceMeta: { attribution: ref.attribution, sourceUrl: ref.sourceUrl, approvedForGer4k: true },
  };
}

/** Wrap generated image data in a labelled AI_GENERATED VisualResult. */
export function generatedVisual(stationId: string, imageData: string): VisualResult {
  return {
    visualType: "AI_GENERATED",
    stationId,
    stationName: stationName(stationId),
    imageData,
    label: AI_GENERATED_LABEL,
  };
}

/** The graceful-fallback VisualResult when generation fails/times out. */
export function fallbackVisual(stationId: string): VisualResult {
  return {
    visualType: "AI_GENERATED",
    stationId,
    stationName: stationName(stationId),
    label: AI_GENERATED_LABEL,
    unavailableMessage: IMAGE_FALLBACK,
  };
}

/** A safe, bounded generation prompt built from structured facts only. */
export function buildIllustrationPrompt(stationId: string): string {
  const name = stationName(stationId);
  return `A clean, modern conceptual illustration of a Klang Valley public-transport station called ${name}. Simplified, friendly, non-photographic. No text, no logos.`;
}
