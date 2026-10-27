import "server-only";

/**
 * Gerak Khas AI explanation layer (Requirement 17) — SERVER ONLY.
 *
 * Reuses the EXISTING Bedrock provider abstraction. It may rephrase ONLY the
 * lead `answer` of an already-assembled GerakKhasResponse. It must not change
 * evidence, actions, routeRecommendation, suggestedPreference, source labels,
 * sourceStatus/isSimulated or any operational fact. On any failure the
 * deterministic response is returned unchanged (never a 500 to the passenger).
 */
import { getAiProvider, isAiConfigured } from "@/services/ai";
import type { GerakKhasResponse } from "./types";

/** Compact the structured facts the model is allowed to REPHRASE (never extend). */
function factsFor(res: GerakKhasResponse): string {
  const lines = [res.answer];
  for (const e of res.evidence ?? []) {
    lines.push(`${e.label}: ${e.value} (${e.sourceStatus}${e.isSimulated ? ", simulated" : ""})`);
  }
  for (const w of res.warnings ?? []) lines.push(`Note: ${w}`);
  return lines.join("\n");
}

export async function explainResponse(
  question: string,
  res: GerakKhasResponse,
): Promise<GerakKhasResponse> {
  if (!isAiConfigured()) return res;
  try {
    const ai = await getAiProvider().explain({
      question,
      profile: "Balanced",
      // The provider receives already-computed facts to rephrase, not to extend.
      recommended: {
        id: res.routeRecommendation?.routeId ?? "answer",
        label: res.routeRecommendation?.title ?? "answer",
        rank: 1,
        travelTimeMin: 0,
        transfers: 0,
        totalWalkMeters: 0,
        confidenceScore: 0,
        confidenceBand: res.confidence?.band ?? "Medium",
      },
      alternatives: [
        {
          id: res.routeRecommendation?.routeId ?? "answer",
          label: res.routeRecommendation?.title ?? "answer",
          rank: 1,
          travelTimeMin: 0,
          transfers: 0,
          totalWalkMeters: 0,
          confidenceScore: 0,
          confidenceBand: res.confidence?.band ?? "Medium",
        },
      ],
      confidenceFactors: [],
      answerFacts: factsFor(res),
    });
    if (ai?.text && ai.text.trim()) {
      // Rephrase the LEAD only; everything else is byte-for-byte unchanged.
      return { ...res, answer: ai.text.trim().slice(0, 600), source: { ai: true } };
    }
    return res;
  } catch {
    // Keep the deterministic response; never surface a server error.
    return res;
  }
}
