/**
 * `POST /api/ask` — the Ask GER4K co-pilot endpoint (Requirements 10, 31).
 *
 * ── The ONLY network call in GER4K ─────────────────────────────────────────
 * Everything else is computed locally against the MockDataProvider; this route
 * is the single server round-trip. It is a THIN handler: it validates input,
 * runs the PURE deterministic co-pilot pipeline (`answerAsk` — intent mapping,
 * CORE Ranking_Engine re-rank, structured answer), and optionally lets the AI
 * provider REPHRASE the answer's lead sentence. It contains no transport
 * intelligence of its own and the AI never ranks, routes or prices.
 *
 * ── Server-only (Requirement 10.4) ─────────────────────────────────────────
 * Route Handlers run on the server; the Bedrock provider is `server-only`, so
 * AWS credentials never reach the browser.
 *
 * ── Response shape ─────────────────────────────────────────────────────────
 * `200 { text, highlights?, source: "bedrock" | "fallback", reranked?, answer }`
 * where `answer` is the structured co-pilot answer (title, lead, bullets,
 * metrics?, suggestion?, followUps) and `reranked` (unchanged from the MVP) is
 * present when a natural-language preference re-ranked the options.
 * Invalid input → `400 { error, field }`. AI failure NEVER causes a 500.
 */

import { NextResponse } from "next/server";

import type {
  AiExplanationOption,
  AiExplanationRequest,
  AskStationContext,
} from "@/services/ai";
import { getAiProvider, isAiConfigured } from "@/services/ai";
import { answerAsk } from "@/services/ai/askAnswer";
import type { AskResponse } from "@/services/ai/askAnswer";

import type { ConfidenceBand, ConfidenceFactor, PreferenceProfile } from "@/types";
import { PREFERENCE_PROFILES } from "@/types";

/** Route Handlers run on the Node.js server runtime (server-only AI import). */
export const runtime = "nodejs";

const CONFIDENCE_BANDS: readonly ConfidenceBand[] = ["High", "Medium", "Low"];

interface ValidationError {
  field: string;
  message: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function validateFactor(value: unknown, path: string): ValidationError | null {
  if (!value || typeof value !== "object") {
    return { field: path, message: `${path} must be an object.` };
  }
  const f = value as Record<string, unknown>;
  if (!isNonEmptyString(f.label)) {
    return { field: `${path}.label`, message: `${path}.label must be a non-empty string.` };
  }
  if (!isFiniteNumber(f.delta)) {
    return { field: `${path}.delta`, message: `${path}.delta must be a number.` };
  }
  return null;
}

/** Validate one flattened option (CORE fields required, Full Vision fields optional). */
function validateOption(value: unknown, path: string): ValidationError | null {
  if (!value || typeof value !== "object") {
    return { field: path, message: `${path} must be an object.` };
  }
  const o = value as Record<string, unknown>;
  if (!isNonEmptyString(o.id)) return { field: `${path}.id`, message: `${path}.id must be a non-empty string.` };
  if (!isNonEmptyString(o.label)) return { field: `${path}.label`, message: `${path}.label must be a non-empty string.` };
  for (const key of ["rank", "travelTimeMin", "transfers", "totalWalkMeters", "confidenceScore"] as const) {
    if (!isFiniteNumber(o[key])) return { field: `${path}.${key}`, message: `${path}.${key} must be a number.` };
  }
  if (!CONFIDENCE_BANDS.includes(o.confidenceBand as ConfidenceBand)) {
    return { field: `${path}.confidenceBand`, message: `${path}.confidenceBand must be one of ${CONFIDENCE_BANDS.join(", ")}.` };
  }
  for (const key of ["routeSummary", "title"] as const) {
    if (o[key] !== undefined && typeof o[key] !== "string") {
      return { field: `${path}.${key}`, message: `${path}.${key} must be a string when present.` };
    }
  }
  for (const key of ["fareSen", "crowdLevel", "accessIssues"] as const) {
    if (o[key] !== undefined && !isFiniteNumber(o[key])) {
      return { field: `${path}.${key}`, message: `${path}.${key} must be a number when present.` };
    }
  }
  for (const key of ["touchStationIds", "pathStationIds", "strategies"] as const) {
    if (o[key] !== undefined && !isStringArray(o[key])) {
      return { field: `${path}.${key}`, message: `${path}.${key} must be a string array when present.` };
    }
  }
  for (const key of ["hasBus", "isSimulated"] as const) {
    if (o[key] !== undefined && typeof o[key] !== "boolean") {
      return { field: `${path}.${key}`, message: `${path}.${key} must be a boolean when present.` };
    }
  }
  if (o.confidenceFactors !== undefined) {
    if (!Array.isArray(o.confidenceFactors)) {
      return { field: `${path}.confidenceFactors`, message: `${path}.confidenceFactors must be an array.` };
    }
    for (let i = 0; i < o.confidenceFactors.length; i++) {
      const err = validateFactor(o.confidenceFactors[i], `${path}.confidenceFactors[${i}]`);
      if (err) return err;
    }
  }
  return null;
}

function validateStation(value: unknown, path: string): ValidationError | null {
  if (!value || typeof value !== "object") return { field: path, message: `${path} must be an object.` };
  const s = value as Record<string, unknown>;
  if (!isNonEmptyString(s.stationId) || !isNonEmptyString(s.name) || !isNonEmptyString(s.condition)) {
    return { field: path, message: `${path} needs stationId, name and condition.` };
  }
  if (!isFiniteNumber(s.reportCount)) return { field: `${path}.reportCount`, message: `${path}.reportCount must be a number.` };
  if (!isStringArray(s.signals)) return { field: `${path}.signals`, message: `${path}.signals must be a string array.` };
  return null;
}

function validateRequest(body: unknown): { request: AiExplanationRequest } | { error: ValidationError } {
  if (!body || typeof body !== "object") {
    return { error: { field: "body", message: "Request body must be a JSON object." } };
  }
  const b = body as Record<string, unknown>;

  if (!PREFERENCE_PROFILES.includes(b.profile as PreferenceProfile)) {
    return { error: { field: "profile", message: `profile must be one of ${PREFERENCE_PROFILES.join(", ")}.` } };
  }
  for (const key of ["question", "disruptionSummary", "destinationName", "focusedOptionId"] as const) {
    if (b[key] !== undefined && typeof b[key] !== "string") {
      return { error: { field: key, message: `${key} must be a string when present.` } };
    }
  }
  if (b.mode !== undefined && b.mode !== "normal" && b.mode !== "recovery") {
    return { error: { field: "mode", message: "mode must be normal or recovery." } };
  }

  const recommendedError = validateOption(b.recommended, "recommended");
  if (recommendedError) return { error: recommendedError };

  if (!Array.isArray(b.alternatives) || b.alternatives.length === 0) {
    return { error: { field: "alternatives", message: "alternatives must be a non-empty array." } };
  }
  for (let i = 0; i < b.alternatives.length; i++) {
    const err = validateOption(b.alternatives[i], `alternatives[${i}]`);
    if (err) return { error: err };
  }
  if (b.candidates !== undefined) {
    if (!Array.isArray(b.candidates)) return { error: { field: "candidates", message: "candidates must be an array." } };
    for (let i = 0; i < b.candidates.length; i++) {
      const err = validateOption(b.candidates[i], `candidates[${i}]`);
      if (err) return { error: err };
    }
  }
  if (b.stations !== undefined) {
    if (!Array.isArray(b.stations)) return { error: { field: "stations", message: "stations must be an array." } };
    for (let i = 0; i < b.stations.length; i++) {
      const err = validateStation(b.stations[i], `stations[${i}]`);
      if (err) return { error: err };
    }
  }

  if (!Array.isArray(b.confidenceFactors)) {
    return { error: { field: "confidenceFactors", message: "confidenceFactors must be an array." } };
  }
  for (let i = 0; i < b.confidenceFactors.length; i++) {
    const err = validateFactor(b.confidenceFactors[i], `confidenceFactors[${i}]`);
    if (err) return { error: err };
  }

  return {
    request: {
      question: b.question as string | undefined,
      profile: b.profile as PreferenceProfile,
      recommended: b.recommended as AiExplanationOption,
      alternatives: b.alternatives as AiExplanationOption[],
      confidenceFactors: b.confidenceFactors as ConfidenceFactor[],
      disruptionSummary: b.disruptionSummary as string | undefined,
      mode: b.mode as "normal" | "recovery" | undefined,
      destinationName: b.destinationName as string | undefined,
      focusedOptionId: b.focusedOptionId as string | undefined,
      candidates: b.candidates as AiExplanationOption[] | undefined,
      stations: b.stations as AskStationContext[] | undefined,
      // answerFacts is set by this handler only, never accepted from clients.
    },
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON.", field: "body" }, { status: 400 });
  }

  const validation = validateRequest(parsed);
  if ("error" in validation) {
    return NextResponse.json(
      { error: validation.error.message, field: validation.error.field },
      { status: 400 },
    );
  }

  // Deterministic co-pilot: intent → CORE re-rank → structured answer.
  const det = answerAsk(validation.request);
  const response: AskResponse = {
    text: det.text,
    highlights: det.highlights,
    source: "fallback",
    ...(det.reranked ? { reranked: det.reranked } : {}),
    answer: det.answer,
  };

  // Optional AI rephrasing of the lead only. Never 500 on AI failure.
  if (isAiConfigured()) {
    try {
      const ai = await getAiProvider().explain({
        ...det.effectiveRequest,
        answerFacts: det.facts,
      });
      response.text = ai.text;
      response.source = "bedrock";
    } catch {
      // Keep the deterministic text.
    }
  }

  return NextResponse.json(response, { status: 200 });
}
