/**
 * `POST /api/gerak-khas` — the Gerak Khas co-pilot endpoint (Requirements 12,
 * 16, 17, 18). A THIN handler modelled on `/api/ask`:
 *
 *   validate -> deterministic orchestrate -> (optional) Bedrock lead rephrase
 *
 * The orchestrator produces a fully-formed GerakKhasResponse with NO AI, so the
 * co-pilot works end-to-end when Bedrock is unavailable. The AI step only
 * rephrases the lead and never changes facts/actions/labels. AI failure NEVER
 * returns a 500. All AI calls are server-side; no credentials reach the client.
 */
import { NextResponse } from "next/server";

import { orchestrate } from "@/services/gerak-khas/orchestrator";
import { explainResponse } from "@/services/gerak-khas/aiExplanation";
import type { CurrentJourneyContext } from "@/services/gerak-khas/types";
import type { Disruption } from "@/types";

export const runtime = "nodejs";

interface AskBody {
  question?: unknown;
  context?: unknown;
  disruptions?: unknown;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: AskBody;
  try {
    body = (await request.json()) as AskBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON.", field: "body" }, { status: 400 });
  }

  if (!isNonEmptyString(body.question)) {
    return NextResponse.json({ error: "question must be a non-empty string.", field: "question" }, { status: 400 });
  }
  if (body.question.length > 500) {
    return NextResponse.json({ error: "question must be 500 characters or fewer.", field: "question" }, { status: 400 });
  }

  // Context is optional; when absent, journey-dependent intents answer honestly.
  const ctx = (body.context ?? null) as CurrentJourneyContext | null;
  const disruptions = Array.isArray(body.disruptions) ? (body.disruptions as Disruption[]) : [];

  // Deterministic co-pilot pipeline (no AI).
  const deterministic = orchestrate({ question: body.question, ctx, disruptions });

  // Optional, server-side AI rephrase of the lead only. Never 500 on failure.
  const response = await explainResponse(body.question, deterministic);

  return NextResponse.json(response, { status: 200 });
}
