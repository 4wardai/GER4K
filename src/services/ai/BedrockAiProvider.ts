/**
 * BedrockAiProvider — the Amazon Bedrock server-side implementation of
 * {@link AiProvider}.
 *
 * ── SERVER-ONLY (Requirement 10.4) ─────────────────────────────────────────
 * This module reads AWS/Bedrock configuration from server-side environment
 * variables and calls Amazon Bedrock. It MUST NEVER run on the client, and the
 * credentials it relies on MUST NEVER be exposed to the browser. Two guards
 * enforce that:
 *
 *   1. The `import "server-only"` at the top. If any client component (or a
 *      module reachable from one) ever imports this file, the Next.js build
 *      FAILS with a clear error — making an accidental client leak impossible
 *      to ship.
 *   2. Config is read only from UNPREFIXED `process.env` keys
 *      (AWS_REGION / BEDROCK_REGION / BEDROCK_MODEL_ID + the AWS default
 *      credential chain). None are `NEXT_PUBLIC_`, so nothing here is inlined
 *      into the client bundle.
 *
 * In the MVP this provider is imported ONLY by the `/api/ask` route handler
 * (task 13.2), which runs server-side.
 *
 * ── Scope (Requirement 10.1) ───────────────────────────────────────────────
 * The provider EXPLAINS already-computed domain results. The prompt instructs
 * the model to explain *why the recommended option is recommended* and *what
 * the confidence factors mean*, in concise plain language for a commuter. The
 * model is explicitly told NOT to invent routes, re-rank options, or change the
 * recommendation — those come from the deterministic domain.
 *
 * ── Failure behaviour ──────────────────────────────────────────────────────
 * The actual SDK call is isolated in {@link BedrockAiProvider.explain}. If the
 * SDK/credentials/model are unavailable at runtime, or the response cannot be
 * parsed, this THROWS a clear {@link BedrockUnavailableError}. The caller (the
 * `/api/ask` handler, task 13.2) catches it and falls back to the deterministic
 * explanation — so the app keeps working when Bedrock is not configured.
 */

import "server-only";

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

import type {
  AiExplanationOption,
  AiExplanationRequest,
  AiExplanationResult,
  AiProvider,
} from "./AiProvider";

/**
 * Thrown when a Bedrock explanation could not be produced (missing config,
 * SDK/credential error, or an unparseable response). The `/api/ask` handler
 * catches this to use the deterministic fallback.
 */
export class BedrockUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "BedrockUnavailableError";
    if (options?.cause !== undefined) {
      // Preserve the underlying cause without widening the public type.
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

/** Server-side Bedrock configuration, resolved from `process.env`. */
interface BedrockConfig {
  region: string;
  modelId: string;
}

/**
 * Resolve Bedrock config from server-side env. Returns `null` when the required
 * values are absent so the handler can decide not to attempt a call. Reads only
 * unprefixed (server-side) variables; never `NEXT_PUBLIC_`.
 *
 * - region: `BEDROCK_REGION` ?? `AWS_REGION`
 * - modelId: `BEDROCK_MODEL_ID`
 *
 * AWS credentials themselves are intentionally NOT read here — the SDK's default
 * credential chain supplies them (env vars, shared config, or the attached
 * IAM/Amplify role), which is the preferred, key-free path in deployment.
 */
export function resolveBedrockConfig(): BedrockConfig | null {
  const region =
    process.env.BEDROCK_REGION?.trim() || process.env.AWS_REGION?.trim() || "";
  const modelId = process.env.BEDROCK_MODEL_ID?.trim() || "";
  if (!region || !modelId) return null;
  return { region, modelId };
}

/** The system instruction keeps the model on-task: explain, never recommend. */
const SYSTEM_PROMPT = [
  "You are GER4K's explanation assistant for Klang Valley public-transport",
  "commuters. You are given recovery options that have ALREADY been computed and",
  "ranked by GER4K's deterministic engine, together with the confidence factors",
  "behind the recommended option.",
  "",
  "Your ONLY job is to explain, in plain, calm, concise language, WHY the",
  "recommended option is recommended and WHAT the confidence factors mean for the",
  "commuter. Personalize the wording to the user's question when one is given.",
  "",
  "Strict rules:",
  "- Do NOT invent stations, lines, routes, or travel times. Use only the data",
  "  provided.",
  "- Do NOT re-rank the options or change which option is recommended.",
  "- Do NOT present confidence as a guaranteed probability of arrival; it is an",
  "  explainable reliability indicator.",
  "- Keep it short and scannable: a brief paragraph plus up to 3 bullet reasons.",
].join("\n");

/** Build a focused user prompt from the already-computed domain results. */
function buildUserPrompt(req: AiExplanationRequest): string {
  // Full Vision co-pilot: GER4K already composed a deterministic answer. The
  // model may only REPHRASE it — no new routes, stations, fares or facts.
  if (req.answerFacts) {
    return [
      req.disruptionSummary ? `Context: ${req.disruptionSummary}` : null,
      req.question ? `The commuter asked: "${req.question}"` : null,
      "",
      "GER4K's answer facts (authoritative, already computed):",
      req.answerFacts,
      "",
      "Rewrite these facts as one or two short, calm, conversational sentences",
      "for a Klang Valley commuter. Use ONLY the facts above. Do not add stations,",
      "routes, times, fares or claims. Do not change which route is suggested.",
      "No bullet points, no headings.",
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  const describe = (o: AiExplanationOption): string =>
    [
      `  #${o.rank} ${o.label} (id=${o.id})`,
      `    time=${o.travelTimeMin}min, transfers=${o.transfers}, walk=${o.totalWalkMeters}m`,
      `    confidence=${o.confidenceScore}/100 (${o.confidenceBand})`,
      o.routeSummary ? `    route=${o.routeSummary}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  const factors = req.confidenceFactors
    .map((f) => `  - ${f.label}: ${f.delta >= 0 ? "+" : ""}${f.delta}`)
    .join("\n");

  return [
    req.disruptionSummary ? `Disruption: ${req.disruptionSummary}` : null,
    `Selected preference: ${req.profile}`,
    "",
    "Recommended option:",
    describe(req.recommended),
    "",
    "All ranked alternatives (in rank order):",
    req.alternatives.map(describe).join("\n"),
    "",
    "Confidence factors for the recommended option:",
    factors || "  (none)",
    "",
    req.question
      ? `The commuter asked: "${req.question}"`
      : "The commuter asked why this option is recommended.",
    "",
    "Explain why the recommended option is recommended for this preference and",
    "what its confidence factors mean. Do not re-rank or invent routes.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Extract the assistant text from a Bedrock Anthropic (Claude messages API)
 * InvokeModel response body. Returns `null` when the shape is unexpected.
 */
function extractText(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const content = (body as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  const parts = content
    .map((block) =>
      block && typeof block === "object" && "text" in block
        ? String((block as { text: unknown }).text ?? "")
        : "",
    )
    .filter((t) => t.length > 0);
  const joined = parts.join("\n").trim();
  return joined.length > 0 ? joined : null;
}

/** Bedrock-backed {@link AiProvider}. Construct via {@link getAiProvider}. */
export class BedrockAiProvider implements AiProvider {
  private readonly config: BedrockConfig;
  private client: BedrockRuntimeClient | null = null;

  constructor(config?: BedrockConfig) {
    const resolved = config ?? resolveBedrockConfig();
    if (!resolved) {
      throw new BedrockUnavailableError(
        "Bedrock is not configured: set BEDROCK_MODEL_ID and AWS_REGION/BEDROCK_REGION.",
      );
    }
    this.config = resolved;
  }

  /** Lazily build the client so construction stays cheap and side-effect free. */
  private getClient(): BedrockRuntimeClient {
    if (!this.client) {
      // Credentials come from the AWS default credential chain — not read here.
      this.client = new BedrockRuntimeClient({ region: this.config.region });
    }
    return this.client;
  }

  async explain(request: AiExplanationRequest): Promise<AiExplanationResult> {
    try {
      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 512,
        temperature: 0.2,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: buildUserPrompt(request) }],
          },
        ],
      };

      const command = new InvokeModelCommand({
        modelId: this.config.modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
      });

      const response = await this.getClient().send(command);
      const raw = new TextDecoder().decode(response.body);
      const parsed: unknown = JSON.parse(raw);
      const text = extractText(parsed);

      if (!text) {
        throw new BedrockUnavailableError(
          "Bedrock returned an unparseable or empty explanation.",
        );
      }

      return { text, source: "bedrock" };
    } catch (error) {
      if (error instanceof BedrockUnavailableError) throw error;
      throw new BedrockUnavailableError(
        "Bedrock explanation request failed.",
        { cause: error },
      );
    }
  }
}
