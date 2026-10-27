/**
 * Deterministic explanation composer (Requirement 10.3).
 *
 * ── Why this module exists ─────────────────────────────────────────────────
 * The GER4K app MUST keep working when the AI provider (Amazon Bedrock) is not
 * configured or fails at runtime. In that case the `/api/ask` handler (task
 * 13.2) returns a plain-language explanation that is assembled WITHOUT AI, from
 * the already-computed domain results it was given: the recommended option's
 * comparison attributes (time / transfers / walking), its confidence band and
 * score, the confidence factors behind that score, and a one-line contrast
 * against the next-best alternative.
 *
 * This logic is deliberately factored out of the route handler into a small,
 * PURE, framework-free function so that:
 *   - task 13.4 can unit-test it in isolation, and
 *   - the handler stays thin (validation + delegation only).
 *
 * The function is a pure data transform: same {@link AiExplanationRequest} in →
 * same {@link AiExplanationResult} out. It performs NO I/O, imports NOTHING from
 * React/Next or the AI SDK, and does NOT re-rank or recompute anything — it only
 * phrases the authoritative domain results it is handed. The produced result is
 * always tagged `source: "fallback"`.
 */

import type {
  AiExplanationOption,
  AiExplanationRequest,
  AiExplanationResult,
} from "./AiProvider";
import type { ConfidenceFactor } from "@/types";

/**
 * Format a confidence factor as a signed, human-readable reason, e.g.
 * `"+6 because Live operator feed on the recovery legs"` or
 * `"−8 because Community-reported crowding at TRX"`. Uses a real minus sign
 * (U+2212) for negative deltas to match GER4K's existing confidence copy.
 */
function formatFactor(factor: ConfidenceFactor): string {
  const sign = factor.delta >= 0 ? "+" : "\u2212"; // U+2212 MINUS SIGN
  const magnitude = Math.abs(factor.delta);
  return `${sign}${magnitude} because ${factor.label}`;
}

/**
 * Compose the one-line comparison between the recommended option and the
 * next-best alternative (the one at rank 2, i.e. the first alternative that is
 * not the recommended option). Returns `null` when there is no distinct
 * runner-up to compare against.
 */
function formatComparison(
  recommended: AiExplanationOption,
  alternatives: ReadonlyArray<AiExplanationOption>,
): string | null {
  const runnerUp = alternatives.find((o) => o.id !== recommended.id);
  if (!runnerUp) return null;

  const diffs: string[] = [];
  const timeDelta = runnerUp.travelTimeMin - recommended.travelTimeMin;
  if (timeDelta > 0) {
    diffs.push(`${timeDelta} min faster`);
  } else if (timeDelta < 0) {
    diffs.push(`${Math.abs(timeDelta)} min slower`);
  }

  const transferDelta = runnerUp.transfers - recommended.transfers;
  if (transferDelta > 0) {
    diffs.push(`${transferDelta} fewer transfer${transferDelta === 1 ? "" : "s"}`);
  } else if (transferDelta < 0) {
    const n = Math.abs(transferDelta);
    diffs.push(`${n} more transfer${n === 1 ? "" : "s"}`);
  }

  const walkDelta = runnerUp.totalWalkMeters - recommended.totalWalkMeters;
  if (walkDelta > 0) {
    diffs.push(`${walkDelta} m less walking`);
  } else if (walkDelta < 0) {
    diffs.push(`${Math.abs(walkDelta)} m more walking`);
  }

  if (diffs.length === 0) {
    return `It is on par with ${runnerUp.label} on time, transfers, and walking.`;
  }
  return `Compared with ${runnerUp.label}, it is ${diffs.join(", ")}.`;
}

/**
 * Build short, scannable highlight bullets from the recommended option's
 * comparison attributes and (up to three) confidence factors. Purely
 * presentational; derived from the same authoritative results.
 */
function buildHighlights(req: AiExplanationRequest): string[] {
  const r = req.recommended;
  const highlights: string[] = [
    `${r.travelTimeMin} min travel time`,
    `${r.transfers} transfer${r.transfers === 1 ? "" : "s"}`,
    `${r.totalWalkMeters} m walking`,
    `Confidence ${r.confidenceBand} (${r.confidenceScore}/100)`,
  ];
  for (const factor of req.confidenceFactors.slice(0, 3)) {
    highlights.push(formatFactor(factor));
  }
  return highlights;
}

/**
 * Compose a deterministic, plain-language explanation of WHY the recommended
 * option is recommended and WHAT its confidence means, straight from the
 * provided domain results (Requirement 10.3).
 *
 * The returned {@link AiExplanationResult} is always `source: "fallback"`. This
 * function never throws for well-formed input and performs no I/O; the handler
 * validates shape before calling it.
 *
 * @param req The already-computed domain results to explain (treated as
 *   authoritative — nothing here is recomputed or re-ranked).
 * @returns A `{ text, highlights, source: "fallback" }` explanation.
 */
export function buildDeterministicExplanation(
  req: AiExplanationRequest,
): AiExplanationResult {
  const r = req.recommended;

  const lead =
    `GER4K recommends ${r.label} (${r.travelTimeMin} min, ` +
    `${r.transfers} transfer${r.transfers === 1 ? "" : "s"}, ` +
    `${r.totalWalkMeters} m walking) for your ${req.profile} preference.`;

  const confidenceFactors = req.confidenceFactors.map(formatFactor);
  const confidenceSentence =
    `Confidence is ${r.confidenceBand} (${r.confidenceScore}/100)` +
    (confidenceFactors.length > 0
      ? `: ${confidenceFactors.join("; ")}.`
      : `.`);

  const comparison = formatComparison(r, req.alternatives);

  const disruptionSentence = req.disruptionSummary
    ? `This recovery responds to: ${req.disruptionSummary}.`
    : null;

  const text = [disruptionSentence, lead, confidenceSentence, comparison]
    .filter((line): line is string => line !== null && line.length > 0)
    .join(" ");

  return {
    text,
    highlights: buildHighlights(req),
    source: "fallback",
  };
}
