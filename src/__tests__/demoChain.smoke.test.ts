/**
 * Happy-path end-to-end smoke test (task 16.2).
 *
 * Drives the FULL 8-step GER4K demo chain, in order, over the corrected demo
 * fixture, asserting each step's key outcome. This is ONE cohesive happy-path
 * chain (a single `it`) whose later steps consume the outputs of the earlier
 * ones — proving the pieces compose end-to-end, not just in isolation:
 *
 *   1. PLAN              (Req 1.1, 1.2) — baseline PS → KLCC = 28 / 1 / 180, 2 legs.
 *   2. TRIGGER DISRUPTION               — the Demo_Scenario disruption is the
 *                                         provider's active disruption.
 *   3. DETECT AFFECTED   (Req 3.1)      — baseline is affected on leg 0.
 *   4. GENERATE RECOVERY (Req 5.2)      — ≥2 alternatives, all avoid TRX→Conlay.
 *   5. RANK              (Req 6.1)      — Fastest → Alt A (via Pasar Seni, 34 min).
 *   6. PREFERENCE RE-RANK(Req 6.1/6.3)  — same set, Least Walking → Alt B
 *                                         (via Masjid Jamek, 260 m); order flips.
 *   7. PULSE             (Req 7.1)      — TRX → Packed / High / count 3.
 *   8. DETERMINISTIC EXPLANATION (Req 10.3 supporting) — the chain degrades to a
 *                                         pure, AI-free explanation of the hero.
 *
 * ── Determinism ────────────────────────────────────────────────────────────
 * No wall-clock, no network. The Pulse step uses an EXPLICIT fixed `now` with
 * reports timestamped relative to it (never `Date.now()`), so ages are stable.
 * The explanation step builds a plain `AiExplanationRequest` INLINE from the
 * ranked alternatives + computed confidence and calls the PURE
 * `buildDeterministicExplanation` — it never touches `/api/ask` or Bedrock, so
 * the test runs offline and always produces the same text.
 */
import { describe, it, expect } from "vitest";

import { planJourney } from "@/domain/transport";
import { evaluateImpactViaProvider } from "@/domain/disruption";
import {
  findRecovery,
  journeyAvoidsBlocked,
  journeySegments,
  computeBlockedSegments,
  rankAlternatives,
} from "@/domain/recovery";
import { computeConfidence } from "@/domain/confidence";
import { aggregatePulse } from "@/domain/community";
import { buildDeterministicExplanation } from "@/services/ai/deterministicExplanation";
import type { AiExplanationOption, AiExplanationRequest } from "@/services/ai";
import {
  createMockDataProvider,
  STATION_IDS,
  LINE_IDS,
  DEMO_ORIGIN_ID,
  DEMO_DESTINATION_ID,
} from "@/data";
import type { CommunityReport, Journey, PreferenceProfile } from "@/types";

/** Fixed reference "now" so every Pulse report age is deterministic. */
const NOW = new Date("2024-01-01T12:00:00.000Z");

/** A recent TRX community report, timestamped `minutesAgo` before fixed NOW. */
function trxReport(id: string, minutesAgo: number): CommunityReport {
  return {
    id,
    stationId: STATION_IDS.trx,
    condition: "Packed",
    timestamp: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString(),
    sourceStatus: "COMMUNITY_REPORTED",
    isSimulated: true,
  };
}

/**
 * Flatten a ranked `Journey` to the AI's `AiExplanationOption` shape.
 *
 * The generator assigns a shared journey id to the alternatives, so we derive a
 * stable, DISTINCT option id/label from the rank — this keeps the deterministic
 * explanation able to tell the recommended option apart from its runner-up.
 */
function toOption(journey: Journey, rank: number): AiExplanationOption {
  const confidence = computeConfidence(journey);
  return {
    id: `option-${rank}`,
    label: `Alternative ${rank} (${journey.totalTimeMin} min via recovery)`,
    rank,
    travelTimeMin: journey.totalTimeMin,
    transfers: journey.transfers,
    totalWalkMeters: journey.totalWalkMeters,
    confidenceScore: confidence.score,
    confidenceBand: confidence.band,
  };
}

describe("GER4K demo chain — happy-path end-to-end smoke (Req 1.1, 1.2, 3.1, 5.2, 6.1, 7.1)", () => {
  it("runs Plan → Disruption → Detect → Recovery → Rank → Re-rank → Pulse → Deterministic explanation", () => {
    const provider = createMockDataProvider();

    // ── 1. PLAN (Req 1.1, 1.2) ───────────────────────────────────────────
    // Baseline Putrajaya Sentral → KLCC = 28 min / 1 transfer / 180 m, 2 legs.
    const planned = planJourney(provider, DEMO_ORIGIN_ID, DEMO_DESTINATION_ID);
    expect(planned.ok).toBe(true);
    if (!planned.ok) return; // narrow for TS
    const baseline = planned.journey;

    expect(baseline.totalTimeMin).toBe(28);
    expect(baseline.transfers).toBe(1);
    expect(baseline.totalWalkMeters).toBe(180);
    expect(baseline.legs).toHaveLength(2);

    // ── 2. TRIGGER DISRUPTION ─────────────────────────────────────────────
    // In the domain, "activating" the Demo_Scenario disruption == evaluating
    // impact with the provider's currently active disruptions. Confirm the
    // provider is actually serving the demo TRX→Conlay disruption.
    const disruptions = provider.getDisruptions();
    expect(disruptions.length).toBeGreaterThanOrEqual(1);
    const demo = disruptions[0];
    expect(demo.affectedSegment.from).toBe(STATION_IDS.trx);
    expect(demo.affectedSegment.to).toBe(STATION_IDS.conlay);

    // ── 3. DETECT AFFECTED (Req 3.1) ──────────────────────────────────────
    // The baseline journey's leg 0 traverses the disrupted TRX→Conlay hop.
    const impact = evaluateImpactViaProvider(baseline, provider);
    expect(impact.affected).toBe(true);
    expect(impact.affectedLegIndexes).toEqual([0]);

    // ── 4. GENERATE RECOVERY (Req 5.2) ────────────────────────────────────
    // ≥2 alternatives, and EVERY one avoids the blocked TRX→Conlay segment.
    const recovery = findRecovery(
      provider,
      DEMO_ORIGIN_ID,
      DEMO_DESTINATION_ID,
      disruptions,
    );
    expect(recovery.ok).toBe(true);
    if (!recovery.ok) return; // narrow for TS
    const alternatives = recovery.alternatives;
    expect(alternatives.length).toBeGreaterThanOrEqual(2);

    const network = provider.getNetwork();
    const blocked = computeBlockedSegments(disruptions, network);
    for (const alt of alternatives) {
      expect(journeyAvoidsBlocked(alt, blocked, network)).toBe(true);
      const traversesBlock = journeySegments(alt, network).some(
        (hop) =>
          hop.from === STATION_IDS.trx &&
          hop.to === STATION_IDS.conlay &&
          hop.lineId === LINE_IDS.putrajaya,
      );
      expect(traversesBlock).toBe(false);
    }

    // The two documented alternatives are present: Alt A (34/2/520 via Pasar
    // Seni) and Alt B (41/2/260 via Masjid Jamek).
    const altA = alternatives.find((a) => a.totalTimeMin === 34);
    const altB = alternatives.find((a) => a.totalTimeMin === 41);
    expect(altA).toBeDefined();
    expect(altB).toBeDefined();
    if (!altA || !altB) return; // narrow for TS
    expect(altA.totalWalkMeters).toBe(520);
    expect(
      altA.legs.some(
        (l) =>
          l.from === STATION_IDS.pasarSeni || l.to === STATION_IDS.pasarSeni,
      ),
    ).toBe(true);
    expect(altB.totalWalkMeters).toBe(260);
    expect(
      altB.legs.some(
        (l) =>
          l.from === STATION_IDS.masjidJamek ||
          l.to === STATION_IDS.masjidJamek,
      ),
    ).toBe(true);

    // ── 5. RANK (Req 6.1) ─────────────────────────────────────────────────
    // Under "Fastest" the recommended (rank 1) is Alt A (34 min, via Pasar Seni).
    // (The generator assigns a shared journey id to the alternatives, so the
    // distinguishing attribute here is travelTime/walk, not id.)
    const fastestProfile: PreferenceProfile = "Fastest";
    const rankedFastest = rankAlternatives(alternatives, fastestProfile);
    expect(rankedFastest[0].totalTimeMin).toBe(34); // Alt A, the fastest
    expect(rankedFastest[0].totalWalkMeters).toBe(520);

    // ── 6. PREFERENCE RE-RANK (Req 6.1, 6.3) ──────────────────────────────
    // The SAME set re-ranks under "Least Walking" → hero changes to Alt B
    // (260 m, via Masjid Jamek), and the overall order flips vs Fastest.
    const leastWalkingProfile: PreferenceProfile = "Least Walking";
    const rankedLeastWalking = rankAlternatives(alternatives, leastWalkingProfile);
    expect(rankedLeastWalking[0].totalWalkMeters).toBe(260); // Alt B, least walking
    expect(rankedLeastWalking[0].totalTimeMin).toBe(41);
    // The preference change actually re-ordered the set (different hero): the
    // Fastest hero (Alt A, 34 min / 520 m) is NOT the Least-Walking hero.
    expect(rankedLeastWalking[0].totalTimeMin).not.toBe(
      rankedFastest[0].totalTimeMin,
    );
    expect(rankedLeastWalking.map((j) => j.totalWalkMeters)).not.toEqual(
      rankedFastest.map((j) => j.totalWalkMeters),
    );

    // ── 7. PULSE (Req 7.1) ────────────────────────────────────────────────
    // Explicit recent reports + fixed NOW keep this fully deterministic (no
    // wall-clock): 3 Packed reports within 10 min of NOW → Packed / High / 3.
    const trxReports = [
      trxReport("trx-1", 2),
      trxReport("trx-2", 5),
      trxReport("trx-3", 8),
    ];
    const pulse = aggregatePulse(STATION_IDS.trx, trxReports, NOW);
    expect(pulse.condition).toBe("Packed");
    expect(pulse.confidence.band).toBe("High");
    expect(pulse.reportCount).toBe(3);

    // ── 8. DETERMINISTIC EXPLANATION (Req 10.3 supporting) ────────────────
    // Build a minimal AiExplanationRequest INLINE from the ranked alternatives
    // + the recommended option's confidence factors, then call the PURE
    // deterministic composer (no AI, no network). This proves the chain
    // degrades to a deterministic explanation of the hero.
    const options = rankedFastest.map((journey, i) => toOption(journey, i + 1));
    const recommendedOption = options[0];
    const recommendedConfidence = computeConfidence(rankedFastest[0]);

    const request: AiExplanationRequest = {
      profile: fastestProfile,
      recommended: recommendedOption,
      alternatives: options,
      confidenceFactors: recommendedConfidence.factors,
    };

    const explanation = buildDeterministicExplanation(request);
    expect(explanation.source).toBe("fallback");
    expect(explanation.text.length).toBeGreaterThan(0);
    // Mentions the recommended option (its label) and the recommendation verb.
    expect(explanation.text).toContain(recommendedOption.label);
    expect(explanation.text).toContain("recommends");
    expect(explanation.highlights).toBeDefined();
    expect(explanation.highlights!.length).toBeGreaterThan(0);
  });
});
