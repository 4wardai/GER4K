/**
 * responseBuilder — assembles a GerakKhasResponse from the deterministic
 * AskAnswer (optional) plus tool evidence, BEFORE any AI language
 * (Requirements 9, 12, 13). Navigation is expressed as structured actions from
 * the closed set, never only in prose. Answers lead with the action and stay
 * concise (<=400 chars).
 */
import type { AskAnswer } from "@/services/ai";
import type { PreferenceProfile } from "@/types";
import type {
  CurrentJourneyContext,
  EvidenceItem,
  GerakKhasAction,
  GerakKhasResponse,
} from "./types";

function clip(text: string, max = 400): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "\u2026";
}

export interface BuildResponseInput {
  answer: string;
  evidence: EvidenceItem[];
  actions: GerakKhasAction[];
  warnings: string[];
  ctx: CurrentJourneyContext | null;
  routeRecommendation?: { routeId: string; title: string };
  suggestedPreference?: PreferenceProfile | null;
  askAnswer?: AskAnswer | null;
}

export function buildResponse(input: BuildResponseInput): GerakKhasResponse {
  const answer = clip(input.answer.trim() || "I don't have anything reliable to add there yet.");
  const res: GerakKhasResponse = {
    answer,
    source: { ai: false },
  };
  if (input.evidence.length > 0) res.evidence = input.evidence;
  if (input.actions.length > 0) res.actions = input.actions;
  if (input.warnings.length > 0) res.warnings = input.warnings;
  if (input.routeRecommendation) res.routeRecommendation = input.routeRecommendation;
  if (input.suggestedPreference) res.suggestedPreference = input.suggestedPreference;

  // Confidence band from the recommended option, when known.
  const rec = input.routeRecommendation
    ? input.ctx?.options.find((o) => o.id === input.routeRecommendation!.routeId)
    : input.ctx?.options.find((o) => o.id === input.ctx?.selectedRouteId) ?? input.ctx?.options[0];
  if (rec?.confidence) {
    res.confidence = {
      band: rec.confidence.band,
      meaning:
        rec.confidence.band === "High"
          ? "Based on scheduled data with corroborating reports."
          : rec.confidence.band === "Medium"
            ? "A reliable estimate; some inputs are simulated or sparse."
            : "Lower certainty — treat as a rough guide.",
    };
  }

  return res;
}

export { clip as clipAnswer };
