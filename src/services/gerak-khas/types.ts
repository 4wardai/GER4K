/**
 * Gerak Khas shared types (Requirements 9, 10, 27).
 *
 * These are the structured contracts the co-pilot is assembled from. Two rules
 * are encoded in the type system:
 *
 *  1. Transport honesty uses TWO INDEPENDENT axes — `sourceStatus` (where the
 *     fact came from) and `isSimulated` (is it part of the demo scenario). They
 *     are never collapsed. Every piece of transport evidence carries both.
 *  2. Image provenance is a SEPARATE concept: a `VisualResult` carries a
 *     `visualType` (REAL_REFERENCE | AI_GENERATED) and NEVER a transport
 *     `sourceStatus`/`isSimulated`.
 */

import type {
  ConfidenceBand,
  JourneyOption,
  MobilityNeed,
  PreferenceProfile,
  SourceStatus,
  StationPulseDetail,
} from "@/types";
import type { AskStationContext } from "@/services/ai";

// ── Chat transcript (Phase 1 UI) ────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  /** Plain lead text shown immediately. */
  text: string;
  /** Structured co-pilot payload for assistant messages (Phase 3+). */
  response?: GerakKhasResponse;
  /** Placeholder flag for Phase 1 deterministic stubs. */
  placeholder?: boolean;
}

// ── Current journey context bridge (published by the journey screen) ─────────

/**
 * The MINIMAL current journey context the journey screen publishes into the
 * globally-mounted provider. It is a projection — never the whole app state,
 * never a second journey engine.
 */
export interface CurrentJourneyContext {
  originId: string;
  destinationId: string;
  originName: string;
  destinationName: string;
  /** The usual planned route id, when one exists. */
  usualRouteId: string | null;
  /** The currently selected option id on the journey screen. */
  selectedRouteId: string | null;
  /** Presented, ranked options (index 0 = recommended). */
  options: JourneyOption[];
  /** Validated candidates not presented (needed for SELECT_ROUTE validity). */
  candidates: JourneyOption[];
  /** Effective ranking profile in force. */
  profile: PreferenceProfile;
  mobilityNeeds: MobilityNeed[];
  /** A station the user is currently focused on, when any. */
  selectedStation?: string | null;
  recovery: boolean;
  /** Short active-disruption summary + severity for the robot light. */
  disruption: { summary: string; severity: "none" | "moderate" | "severe" } | null;
  /** Per-station pulse details for stations on the journey. */
  pulse: Record<string, StationPulseDetail>;
  /** Flattened station contexts (name, condition, isOKU, demand). */
  stations: AskStationContext[];
  now: number;
}

// ── Source / simulation (two independent axes) ───────────────────────────────

export interface SourceLabel {
  sourceStatus: SourceStatus;
  isSimulated: boolean;
}

// ── Evidence ─────────────────────────────────────────────────────────────────

export type MobilityToolName =
  | "journey"
  | "recovery"
  | "ranking"
  | "fare"
  | "walking"
  | "pulse"
  | "station"
  | "bus"
  | "service"
  | "accessibility"
  | "historicalDemand"
  | "visual";

/** One piece of structured evidence. Both label axes are ALWAYS separate. */
export interface EvidenceItem {
  tool: MobilityToolName;
  label: string;
  /** Human-readable, already-formatted value (e.g. "RM5.10", "260 m"). */
  value: string;
  sourceStatus: SourceStatus;
  isSimulated: boolean;
  stationId?: string;
  routeId?: string;
}

// ── Intents + constraints ─────────────────────────────────────────────────────

export type GerakKhasIntent =
  | "journey"
  | "recovery"
  | "recommendation"
  | "station"
  | "bus"
  | "fare"
  | "walking"
  | "crowding"
  | "service"
  | "accessibility"
  | "historicalDemand"
  | "visual"
  | "liveness"
  | "unsupported";

/**
 * Deterministic constraints extracted from the question. The orchestrator
 * FILTERS the candidate set with these BEFORE the Ranking_Engine orders it.
 * The LLM never filters and never ranks.
 */
export interface ConstraintSet {
  /** Stations the passenger wants to avoid (drop options touching them). */
  excludeStationIds: string[];
  /** Require a bus/feeder-supported option. */
  requireBus: boolean;
  /** Apply the Accessible preference and surface accessibility evidence. */
  requireAccessiblePreference: boolean;
}

export interface RoutedIntent {
  primary: GerakKhasIntent;
  secondary: GerakKhasIntent[];
  constraints: ConstraintSet;
  /** A ranking profile the question implies, when any. */
  preference: PreferenceProfile | null;
  /** A station the question names, resolved to an id, when any. */
  stationId: string | null;
  /** The tools the orchestrator will call for this question (fixed, finite). */
  tools: MobilityToolName[];
}

// ── Actions (closed set) ──────────────────────────────────────────────────────

export type GerakKhasActionType =
  | "SELECT_ROUTE"
  | "SET_PREFERENCE"
  | "OPEN_STATION"
  | "OPEN_PULSE"
  | "SHOW_SERVICE"
  | "SHOW_BUS"
  | "SHOW_VISUAL"
  | "REPORT_CONDITION";

export type GerakKhasAction =
  | { type: "SELECT_ROUTE"; label: string; routeId: string; profile?: PreferenceProfile }
  | { type: "SET_PREFERENCE"; label: string; preference: PreferenceProfile }
  | { type: "OPEN_STATION"; label: string; stationId: string }
  | { type: "OPEN_PULSE"; label: string; stationId?: string }
  | { type: "SHOW_SERVICE"; label: string; lineId?: string }
  | { type: "SHOW_BUS"; label: string; routeId: string; profile?: PreferenceProfile }
  | { type: "SHOW_VISUAL"; label: string; stationId: string; mode: VisualType }
  | { type: "REPORT_CONDITION"; label: string; stationId: string };

// ── Visuals (provenance via visualType ONLY) ──────────────────────────────────

export type VisualType = "REAL_REFERENCE" | "AI_GENERATED";

export const REAL_REFERENCE_LABEL = "REAL REFERENCE PHOTO" as const;
export const AI_GENERATED_LABEL =
  "AI-GENERATED ILLUSTRATION / NOT AN ACTUAL STATION PHOTO" as const;

export interface VisualResult {
  visualType: VisualType;
  stationId: string;
  stationName: string;
  /** App-local asset path for REAL_REFERENCE. */
  imageUrl?: string;
  /** Base64 / data URL for AI_GENERATED. */
  imageData?: string;
  label: typeof REAL_REFERENCE_LABEL | typeof AI_GENERATED_LABEL;
  /** Required for REAL_REFERENCE; omitted for AI_GENERATED. */
  sourceMeta?: { attribution: string; sourceUrl?: string; approvedForGer4k: true };
  /** Graceful-fallback text when no image is available. */
  unavailableMessage?: string;
}

// ── Structured response ───────────────────────────────────────────────────────

export interface GerakKhasResponse {
  /** Concise, action-led lead text (<=400 chars). */
  answer: string;
  evidence?: EvidenceItem[];
  /** AI vs non-AI origin of the wording (NOT a transport source axis). */
  source?: { ai: boolean; note?: string };
  routeRecommendation?: { routeId: string; title: string };
  suggestedPreference?: PreferenceProfile;
  actions?: GerakKhasAction[];
  visual?: VisualResult;
  confidence?: { band: ConfidenceBand; meaning: string };
  warnings?: string[];
}

// ── Tool result envelope ──────────────────────────────────────────────────────

/** Common shape every Mobility_Tool returns. `ok:false` means unavailable. */
export type MobilityToolResult<T> =
  | { ok: true; data: T; evidence: EvidenceItem[] }
  | { ok: false; reason: string; evidence?: EvidenceItem[] };

