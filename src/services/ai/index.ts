/**
 * GER4K AI service — server entry point.
 *
 * ── What this module exposes ───────────────────────────────────────────────
 *  - The provider INTERFACE and request/response shapes ({@link AiProvider},
 *    {@link AiExplanationRequest}, {@link AiExplanationResult}, …). These are
 *    framework-free TYPES and are safe to import anywhere (type-only).
 *  - {@link isAiConfigured} — a tiny server-side helper reading env so the
 *    `/api/ask` handler can decide whether to even attempt Bedrock.
 *  - {@link getAiProvider} — a factory returning the configured
 *    {@link BedrockAiProvider}.
 *
 * ── Deterministic fallback boundary (for task 13.2) ────────────────────────
 * The AI service is ONLY the interface + the Bedrock implementation. It does
 * NOT own the deterministic fallback. By design (Requirement 10.3) the
 * `/api/ask` handler composes the fallback from the confidence factors and the
 * comparison attributes it already has, so the app works end-to-end when AI is
 * unavailable:
 *
 *   1. Handler calls `isAiConfigured()`. If false, it SKIPS Bedrock entirely
 *      and returns the deterministic explanation ({ source: "fallback" }).
 *   2. If configured, the handler calls `getAiProvider().explain(req)` inside a
 *      try/catch. On any thrown error (e.g. `BedrockUnavailableError`), it uses
 *      the SAME deterministic fallback.
 *
 * Keeping the fallback in the handler — not in this service — means the AI layer
 * stays a pure explanation/personalization provider, and the domain + handler
 * remain fully functional without it.
 *
 * ── Server-only ────────────────────────────────────────────────────────────
 * {@link getAiProvider} / {@link isAiConfigured} read `process.env` and the
 * Bedrock provider is marked `server-only`; import them only from server code
 * (the `/api/ask` route handler). The type exports below are safe for any
 * import because they carry no runtime code.
 */

import type { AiProvider } from "./AiProvider";
import { BedrockAiProvider, resolveBedrockConfig } from "./BedrockAiProvider";

// Re-export the interface + request/response shapes for consumers.
export type {
  AiProvider,
  AiExplanationRequest,
  AiExplanationResult,
  AiExplanationOption,
  AskStationContext,
} from "./AiProvider";

export type {
  AskIntent,
  AskAnswer,
  AskResponse,
  AskSuggestion,
  AskReranked,
} from "./askAnswer";

// Re-export the Bedrock implementation and its error for the handler.
export { BedrockAiProvider, BedrockUnavailableError } from "./BedrockAiProvider";

/**
 * True when Bedrock is configured via server-side env (a model id and a
 * region are present). Lets the `/api/ask` handler decide whether to attempt a
 * Bedrock call at all before falling back to the deterministic explanation.
 *
 * Reads only unprefixed, server-side env — never `NEXT_PUBLIC_`.
 */
export function isAiConfigured(): boolean {
  return resolveBedrockConfig() !== null;
}

/**
 * Construct the configured AI provider (Amazon Bedrock).
 *
 * Throws {@link BedrockUnavailableError} when Bedrock is not configured — so
 * callers should either guard with {@link isAiConfigured} first, or wrap this in
 * the same try/catch that triggers the deterministic fallback.
 */
export function getAiProvider(): AiProvider {
  return new BedrockAiProvider();
}
