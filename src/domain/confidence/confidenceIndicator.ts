/**
 * Confidence_Indicator — pure, framework-free explainable journey confidence.
 *
 * ── What this IS (Requirement 6.4) ─────────────────────────────────────────
 * Journey Confidence is an **explainable product confidence indicator**, NOT a
 * scientifically validated probability of successful arrival. It exists so the
 * UI can show a 0–100 score, a High/Medium/Low band, AND a transparent list of
 * the factors that produced that score (the "Why this confidence?" reveal). The
 * number is a heuristic reliability signal assembled from data-source labels,
 * transfer count, Pulse context, and simulation status — never a statistical
 * success probability. Callers and UI copy must treat it as such.
 *
 * It imports NOTHING from React or Next and does no I/O: given the same journey
 * (and optional context) it always returns the same {@link JourneyConfidence},
 * so it is trivially unit-testable with Vitest.
 *
 * ── Algorithm (design "Journey confidence", Req 6.4) ───────────────────────
 * Start from a **base of 60** and apply additive factor deltas, then clamp the
 * final score to `[0,100]`:
 *
 *   | Factor                                   | Delta |
 *   |------------------------------------------|-------|
 *   | Any leg `LIVE` / `OPERATOR_CONFIRMED`    |  +20  |
 *   | Journey `SCHEDULED`                      |   +5  |
 *   | Any leg `UNVERIFIED`                     |  −20  |
 *   | Relies on scheduled where live expected  |   −5  |
 *   | Per transfer beyond the first            |   −4  |
 *   | Recent Pulse info present on route       |   +8  |
 *   | Recent Pulse Packed / Severe on route    |  −10  |
 *   | `isSimulated` or mixed/unknown tags      |   −8  |
 *
 * Bands: **High ≥ 75, Medium 50–74, Low < 50**.
 *
 * ── Base-as-factor + clamp-adjustment (makes Σfactors === score ALWAYS) ─────
 * Property 6 (Req 6.4) requires that the returned `factors[]` **sum to the
 * final clamped `score`**, while the model is additive from base 60. We satisfy
 * BOTH honestly:
 *
 *   1. The base 60 is itself represented as the first factor
 *      `{ label: "Base confidence", delta: 60 }`. So before any clamping the
 *      sum of all factors equals `raw = 60 + Σ(other deltas)`.
 *   2. `score = clamp(raw, 0, 100)`.
 *   3. When clamping actually changed the value (`raw !== score`, i.e. raw > 100
 *      or raw < 0), we append a final transparency factor
 *      `{ label: "Clamped to valid range", delta: score - raw }`.
 *
 * With that clamp-adjustment factor, `Σfactors === score` in every case,
 * including the clamped ones, AND the reveal stays honest because it explicitly
 * shows the clamp happened. When no clamping occurred, no adjustment factor is
 * added and `Σfactors === raw === score` naturally.
 */

import type {
  ConfidenceBand,
  ConfidenceFactor,
  Journey,
  JourneyConfidence,
  SourceStatus,
} from "@/types";

/** The confidence model's base value, exposed for clarity/testing. */
export const BASE_CONFIDENCE = 60;

/** Band thresholds (design: High ≥ 75, Medium 50–74, Low < 50). */
export const HIGH_THRESHOLD = 75;
export const MEDIUM_THRESHOLD = 50;

/** The known {@link SourceStatus} set, used to detect "unknown" leg tags. */
const KNOWN_SOURCE_STATUSES: ReadonlySet<SourceStatus> = new Set<SourceStatus>([
  "LIVE",
  "SCHEDULED",
  "OPERATOR_CONFIRMED",
  "COMMUNITY_REPORTED",
  "UNVERIFIED",
  // Full Vision (Requirement 32.4): recognised statuses, not "unknown". Mixed
  // statuses across legs (e.g. SCHEDULED rail + ESTIMATED walk) still apply the
  // existing "mixed/unknown tags" factor unchanged.
  "HISTORICAL",
  "ESTIMATED",
]);

/**
 * Optional context carrying route-level Pulse signals the journey itself does
 * not encode. When omitted (or its flags are falsy) the Pulse-related factors
 * are simply not applied — the indicator still works from the journey alone.
 *
 * Callers may either set the simple boolean flags directly, or pass the route's
 * {@link PulseSummary} list and let {@link computeConfidence} derive the flags:
 *   - `hasRecentPulse` ← any summary has `reportCount > 0`.
 *   - `hasPackedOrSeverePulse` ← any summary condition is Packed/Severe.
 * Explicit flags, when provided, take precedence over `routePulse` derivation.
 */
export interface ConfidenceContext {
  /** Recent Pulse info exists somewhere on the route. */
  hasRecentPulse?: boolean;
  /** A Packed / Severe disruption condition exists on the route. */
  hasPackedOrSeverePulse?: boolean;
  /** Optional raw Pulse summaries for the route; used to derive the flags above. */
  routePulse?: ReadonlyArray<{
    condition?: string;
    reportCount?: number;
  }>;
}

/** Clamp a number to the inclusive `[min, max]` range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Map a score to its {@link ConfidenceBand} using the design thresholds.
 * High ≥ 75, Medium 50–74, Low < 50.
 */
export function scoreToBand(score: number): ConfidenceBand {
  if (score >= HIGH_THRESHOLD) return "High";
  if (score >= MEDIUM_THRESHOLD) return "Medium";
  return "Low";
}

/** Resolve the effective Pulse flags from explicit flags and/or `routePulse`. */
function resolvePulseFlags(context?: ConfidenceContext): {
  hasRecentPulse: boolean;
  hasPackedOrSevere: boolean;
} {
  if (!context) return { hasRecentPulse: false, hasPackedOrSevere: false };

  const derivedRecent =
    context.routePulse?.some((p) => (p.reportCount ?? 0) > 0) ?? false;
  const derivedPackedOrSevere =
    context.routePulse?.some(
      (p) => p.condition === "Packed" || p.condition === "Severe disruption",
    ) ?? false;

  return {
    hasRecentPulse: context.hasRecentPulse ?? derivedRecent,
    hasPackedOrSevere: context.hasPackedOrSeverePulse ?? derivedPackedOrSevere,
  };
}

/**
 * Compute an explainable {@link JourneyConfidence} for a journey.
 *
 * Pure and deterministic. The returned `factors[]` always sum to the returned
 * (clamped) `score`, and `band` always matches `score` via {@link scoreToBand}.
 *
 * Each factor's exact trigger:
 *  - **Base confidence (+60)** — always applied; the additive model's base.
 *  - **Any leg LIVE / OPERATOR_CONFIRMED (+20)** — any leg's `sourceStatus` is
 *    `"LIVE"` or `"OPERATOR_CONFIRMED"`.
 *  - **Journey SCHEDULED (+5)** — `journey.sourceStatus === "SCHEDULED"` (the
 *    planner/recovery engine sets this for baseline/recovery journeys).
 *  - **Any leg UNVERIFIED (−20)** — any leg's `sourceStatus === "UNVERIFIED"`.
 *  - **Relies on scheduled where live expected (−5)** — the journey is
 *    `SCHEDULED` AND no leg is `LIVE`/`OPERATOR_CONFIRMED` (we only have
 *    scheduled data where a live feed would be ideal).
 *  - **Per transfer beyond the first (−4 each)** — `−4 * max(0, transfers − 1)`.
 *  - **Recent Pulse info present on route (+8)** — context indicates recent
 *    Pulse data exists on the route.
 *  - **Recent Pulse Packed / Severe on route (−10)** — context indicates a
 *    Packed/Severe condition on the route.
 *  - **isSimulated or mixed/unknown tags (−8)** — `journey.isSimulated` is true,
 *    OR legs carry mixed statuses (legs differ in `sourceStatus`), OR any leg
 *    carries an unknown `sourceStatus` (not in the known set).
 */
export function computeConfidence(
  journey: Journey,
  context?: ConfidenceContext,
): JourneyConfidence {
  const factors: ConfidenceFactor[] = [];

  // 1. Base confidence, represented as a factor so Σfactors includes the base.
  factors.push({ label: "Base confidence", delta: BASE_CONFIDENCE });

  const legs = journey.legs ?? [];
  const hasLiveOrConfirmed = legs.some(
    (l) => l.sourceStatus === "LIVE" || l.sourceStatus === "OPERATOR_CONFIRMED",
  );
  const hasUnverified = legs.some((l) => l.sourceStatus === "UNVERIFIED");
  const journeyScheduled = journey.sourceStatus === "SCHEDULED";

  // 2. Any leg LIVE / OPERATOR_CONFIRMED (+20).
  if (hasLiveOrConfirmed) {
    factors.push({ label: "Live or operator-confirmed data", delta: 20 });
  }

  // 3. Journey SCHEDULED (+5).
  if (journeyScheduled) {
    factors.push({ label: "Scheduled journey data", delta: 5 });
  }

  // 4. Any leg UNVERIFIED (−20).
  if (hasUnverified) {
    factors.push({ label: "Unverified leg data", delta: -20 });
  }

  // 5. Relies on scheduled where live expected (−5): scheduled journey with no
  //    live/operator-confirmed leg to back it up.
  if (journeyScheduled && !hasLiveOrConfirmed) {
    factors.push({ label: "Relies on scheduled where live expected", delta: -5 });
  }

  // 6. Per transfer beyond the first (−4 each).
  const extraTransfers = Math.max(0, (journey.transfers ?? 0) - 1);
  if (extraTransfers > 0) {
    factors.push({
      label:
        extraTransfers === 1
          ? "1 transfer beyond the first"
          : `${extraTransfers} transfers beyond the first`,
      delta: -4 * extraTransfers,
    });
  }

  // 7 & 8. Pulse context factors (only when context supplies the signal).
  const { hasRecentPulse, hasPackedOrSevere } = resolvePulseFlags(context);
  if (hasRecentPulse) {
    factors.push({ label: "Recent Pulse info on route", delta: 8 });
  }
  if (hasPackedOrSevere) {
    factors.push({ label: "Packed or severe Pulse condition on route", delta: -10 });
  }

  // 9. isSimulated or mixed/unknown tags (−8).
  //    "mixed" = legs with differing sourceStatus; "unknown" = any leg status
  //    not in the known SourceStatus set.
  const distinctStatuses = new Set(legs.map((l) => l.sourceStatus));
  const hasMixedStatuses = distinctStatuses.size > 1;
  const hasUnknownStatus = legs.some(
    (l) => !KNOWN_SOURCE_STATUSES.has(l.sourceStatus),
  );
  if (journey.isSimulated || hasMixedStatuses || hasUnknownStatus) {
    factors.push({ label: "Simulated or mixed/unknown source tags", delta: -8 });
  }

  // Raw = sum of all applied factors (base included). Clamp to [0,100].
  const raw = factors.reduce((sum, f) => sum + f.delta, 0);
  const score = clamp(raw, 0, 100);

  // When clamping changed the value, append a transparent adjustment factor so
  // that Σfactors === score while the reveal still shows the clamp honestly.
  if (raw !== score) {
    factors.push({ label: "Clamped to valid range", delta: score - raw });
  }

  return { score, band: scoreToBand(score), factors };
}
