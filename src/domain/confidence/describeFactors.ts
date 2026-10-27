/**
 * Passenger-language confidence explanations (Requirement 32).
 *
 * Translates the CORE Confidence_Indicator's factor labels into plain
 * sentences. The numeric deltas are intentionally NOT included — they are only
 * shown in developer/presenter mode. Pure and deterministic.
 */

import type { ConfidenceBand, ConfidenceFactor } from "@/types";

export interface FactorSentence {
  text: string;
  /** "good" raises confidence, "risk" lowers it. */
  tone: "good" | "risk";
}

/** Map one CORE factor to a passenger sentence (null = not worth showing). */
export function describeFactor(factor: ConfidenceFactor): FactorSentence | null {
  const { label, delta } = factor;
  if (label === "Base confidence" || label === "Clamped to valid range") return null;
  if (label === "Scheduled journey data") {
    return { text: "Based on the official timetable", tone: "good" };
  }
  if (label === "Live or operator-confirmed data") {
    return { text: "Backed by live or operator-confirmed information", tone: "good" };
  }
  if (label === "Relies on scheduled where live expected") {
    return { text: "No live train data is connected for this route yet", tone: "risk" };
  }
  if (label === "Unverified leg data") {
    return { text: "Part of this route is unconfirmed", tone: "risk" };
  }
  if (label.includes("transfer") && label.includes("beyond the first")) {
    return { text: "An extra change adds a chance of a missed connection", tone: "risk" };
  }
  if (label === "Recent Pulse info on route") {
    return { text: "Fresh commuter reports along the way", tone: "good" };
  }
  if (label === "Packed or severe Pulse condition on route") {
    return { text: "Commuters report heavy crowding on this route", tone: "risk" };
  }
  if (label === "Simulated or mixed/unknown source tags") {
    return { text: "Includes estimated or simulated information", tone: "risk" };
  }
  return { text: label, tone: delta >= 0 ? "good" : "risk" };
}

/** All passenger sentences for a factor list, risks first. */
export function describeFactors(factors: ReadonlyArray<ConfidenceFactor>): FactorSentence[] {
  const out = factors
    .map(describeFactor)
    .filter((s): s is FactorSentence => s !== null);
  return [...out.filter((s) => s.tone === "risk"), ...out.filter((s) => s.tone === "good")];
}

/** Band in words, e.g. "Medium confidence". */
export function bandLabel(band: ConfidenceBand): string {
  return `${band} confidence`;
}

/** One-line meaning of a band for passengers. */
export function bandMeaning(band: ConfidenceBand): string {
  if (band === "High") return "Good information backs this route.";
  if (band === "Medium") return "Reasonable, but some information is scheduled or estimated rather than live.";
  return "Treat with care — part of this route is unconfirmed or estimated.";
}
