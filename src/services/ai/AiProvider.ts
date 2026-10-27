/**
 * GER4K AI service — provider interface and request/response shapes.
 *
 * ── Role of the AI layer (Requirement 10.1) ────────────────────────────────
 * The AI service is the **explanation / personalization layer only**. It is
 * given ALREADY-COMPUTED domain results — the ranked recovery alternatives, the
 * recommended option, its confidence factors, and the comparison attributes —
 * and produces a plain-language EXPLANATION of *why this option* and *why this
 * confidence* for a Klang Valley commuter.
 *
 * It NEVER produces core recommendations. It does not plan journeys, does not
 * rank alternatives, and does not compute confidence. Those are the job of the
 * pure, framework-free domain (`src/domain/*`). If AI is unavailable the app
 * still works end-to-end; the deterministic fallback explanation is composed by
 * the `/api/ask` handler (task 13.2), NOT here (see `getAiProvider` /
 * `isAiConfigured` notes in `index.ts`).
 *
 * ── Dependency direction ───────────────────────────────────────────────────
 * This module defines only TYPES — it is framework-free and safe to import from
 * either server code or (type-only) client code. The concrete server-side
 * implementation ({@link BedrockAiProvider}) is marked `server-only`; it is
 * imported exclusively by the `/api/ask` route handler so credentials never
 * reach the client (Requirement 10.4).
 *
 * The request/response shapes below are deliberately plain, serializable data
 * (no class instances, no functions) because they cross the `/api/ask` network
 * boundary in task 13.2.
 */

import type {
  ConfidenceBand,
  ConfidenceFactor,
  PreferenceProfile,
} from "@/types";

/**
 * A single recovery option, flattened to the attributes the AI needs to explain
 * it. This is derived by the handler from the domain's `RankedJourney` — the AI
 * receives the ALREADY-RANKED result, it does not re-rank.
 */
export interface AiExplanationOption {
  /** Stable journey id, so the explanation can reference a specific option. */
  id: string;
  /** Human-friendly label, e.g. "Alternative A — via Pasar Seni". */
  label: string;
  /** 1-based rank position the domain assigned (1 = recommended). */
  rank: number;
  /** Estimated total travel time, in minutes. */
  travelTimeMin: number;
  /** Number of transfers. */
  transfers: number;
  /** Total walking distance, in metres. */
  totalWalkMeters: number;
  /** Confidence score the domain computed (0..100). */
  confidenceScore: number;
  /** Confidence band the domain computed. */
  confidenceBand: ConfidenceBand;
  /**
   * Short human-readable summary of the route path, e.g.
   * "Putrajaya Line → TRX → Kajang Line → Pasar Seni → Kelana Jaya Line → KLCC".
   * Optional; helps the model describe the route without inventing one.
   */
  routeSummary?: string;

  // ── Full Vision (Requirement 31) — all optional, domain-computed ──────────
  /** Passenger title, e.g. "via TRX + Pasar Seni". */
  title?: string;
  /** Estimated fare in sen (DEMO FARE ESTIMATE). */
  fareSen?: number;
  /** Max Pulse severity 0–3 at touch stations. */
  crowdLevel?: number;
  /** Touch stations with accessibility issues. */
  accessIssues?: number;
  /** Stations where the passenger boards, changes or alights. */
  touchStationIds?: string[];
  /** Every station along the path (including pass-through). */
  pathStationIds?: string[];
  /** True when the option uses a bus or replacement bus. */
  hasBus?: boolean;
  /** True when any leg is simulated. */
  isSimulated?: boolean;
  /** Strategy tags, e.g. ["Fastest"]. */
  strategies?: string[];
  /** The option's own confidence factors (for "Why this confidence?"). */
  confidenceFactors?: ConfidenceFactor[];
}

/** Station context for "What is happening at TRX?" (Full Vision). */
export interface AskStationContext {
  stationId: string;
  name: string;
  condition: string;
  reportCount: number;
  /** Minutes since the latest report, or null when none. */
  freshnessMin: number | null;
  band: ConfidenceBand;
  trend: "rising" | "steady" | "easing";
  signals: string[];
  /** Historical demand band, labelled HISTORICAL in the UI. */
  demandBand?: "HIGH" | "MEDIUM" | "LOW";
  isOKU?: boolean;
  isSimulated: boolean;
}

/**
 * The request the AI service explains. It carries the domain results needed to
 * answer "why this option" and "why this confidence" in plain language.
 *
 * All fields are already-computed domain outputs (plus an optional free-text
 * question). The provider must treat them as authoritative facts to EXPLAIN —
 * it must not recompute, re-rank, or invent routes.
 */
export interface AiExplanationRequest {
  /**
   * Optional free-text user question, e.g. "why not the faster one?" or
   * "I hate walking". The provider may use it to personalize the explanation.
   * Mapping a natural-language preference to a supported {@link PreferenceProfile}
   * and requesting a re-rank is the HANDLER's concern (task 13.2); the provider
   * only personalizes the wording of the explanation around the given results.
   */
  question?: string;
  /** The currently selected preference profile the ranking was produced under. */
  profile: PreferenceProfile;
  /** The recommended (rank 1) option. */
  recommended: AiExplanationOption;
  /**
   * All ranked alternatives in rank order, including {@link recommended}. Lets
   * the explanation contrast the recommendation against the others.
   */
  alternatives: AiExplanationOption[];
  /**
   * The confidence factors behind the recommended option's score — the same
   * `{ label, delta }[]` the Confidence_Indicator produced. These are what the
   * "why this confidence" explanation is built from.
   */
  confidenceFactors: ConfidenceFactor[];
  /**
   * Optional short note about the active disruption being recovered from, e.g.
   * "Simulated Severe disruption on the Putrajaya Line between TRX and Conlay".
   * Helps the model frame why a recovery is needed. Optional.
   */
  disruptionSummary?: string;

  // ── Full Vision (Requirement 31) — all optional ──────────────────────────
  /** "normal" or "recovery" — frames the wording. */
  mode?: "normal" | "recovery";
  /** Destination display name. */
  destinationName?: string;
  /** The option the question is about (defaults to the recommended one). */
  focusedOptionId?: string;
  /** Validated candidates that are NOT presented (e.g. a dominated bus option). */
  candidates?: AiExplanationOption[];
  /** Pulse/station context for stations on the presented options. */
  stations?: AskStationContext[];
  /**
   * Deterministic answer facts the AI provider may REPHRASE (never extend).
   * Set by the handler, not the client.
   */
  answerFacts?: string;
}

/**
 * The AI service's answer. `text` is the plain-language explanation to render;
 * the optional structured fields let the UI present an actionable, scannable
 * answer without the AI ever overriding the domain.
 */
export interface AiExplanationResult {
  /** The natural-language explanation to display. */
  text: string;
  /**
   * Optional short, scannable bullet points (e.g. the key reasons this option
   * was recommended). Purely presentational; derived from the same results.
   */
  highlights?: string[];
  /**
   * Which provider produced this result, for transparency/telemetry.
   * The deterministic fallback (handler) uses "fallback".
   */
  source: "bedrock" | "fallback";
}

/**
 * The interface the app depends on. A single `explain` call turns
 * already-computed domain results into a natural-language explanation.
 *
 * Implementations:
 *  - {@link BedrockAiProvider} — calls Amazon Bedrock server-side.
 *  - (the deterministic fallback is NOT a provider; it lives in the `/api/ask`
 *    handler so the app works when no provider is configured — task 13.2.)
 */
export interface AiProvider {
  explain(request: AiExplanationRequest): Promise<AiExplanationResult>;
}
