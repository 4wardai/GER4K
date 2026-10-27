/**
 * `POST /api/gerak-khas/visual` — station visuals (Requirements 27, 28, 29).
 * SERVER-ONLY. Two modes:
 *   - "real"      -> curated REAL_REFERENCE photo (with attribution) or the
 *                    honest "no real reference photo yet" result.
 *   - "generated" -> an AI_GENERATED illustration via the configured
 *                    ImageProvider, with a 15s timeout and graceful fallback.
 * Returns ONLY the VisualResult (no secrets, no provider internals). Image
 * generation never blocks journey/recovery — on any failure it returns the
 * fallback message plus the available (structured) station info.
 */
import { NextResponse } from "next/server";

import { demoStations } from "@/data";
import {
  buildIllustrationPrompt,
  fallbackVisual,
  generatedVisual,
  resolveRealVisual,
} from "@/services/gerak-khas/visual/visualTool";
import { stationName } from "@/components/state/useLiveData";

export const runtime = "nodejs";

const TIMEOUT_MS = 15_000;

function knownStation(id: unknown): id is string {
  return typeof id === "string" && demoStations.some((s) => s.id === id);
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: { stationId?: unknown; mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON.", field: "body" }, { status: 400 });
  }

  if (!knownStation(body.stationId)) {
    return NextResponse.json({ error: "Unknown station.", field: "stationId" }, { status: 400 });
  }
  const stationId = body.stationId;
  const mode = body.mode === "generated" ? "generated" : "real";

  // Real reference mode: curated photo or honest "no photo yet".
  if (mode === "real") {
    return NextResponse.json(resolveRealVisual(stationId), { status: 200 });
  }

  // Generated mode: only when a provider is configured; else graceful fallback.
  try {
    const { isImageProviderConfigured, BedrockImageProvider } = await import(
      "@/services/gerak-khas/visual/BedrockImageProvider"
    );
    if (!isImageProviderConfigured()) {
      return NextResponse.json(fallbackVisual(stationId), { status: 200 });
    }
    const provider = new BedrockImageProvider();
    const result = await withTimeout(
      provider.generateIllustration({
        stationId,
        stationName: stationName(stationId),
        prompt: buildIllustrationPrompt(stationId),
      }),
      TIMEOUT_MS,
    );
    return NextResponse.json(generatedVisual(stationId, result.imageData), { status: 200 });
  } catch {
    // Any failure/timeout: non-blocking graceful fallback (never a 500).
    return NextResponse.json(fallbackVisual(stationId), { status: 200 });
  }
}
