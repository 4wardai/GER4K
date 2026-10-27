/**
 * GER4K confidence domain barrel.
 *
 * Pure, framework-free Confidence_Indicator exports. Consumers import from
 * `@/domain/confidence` rather than reaching into individual files.
 *
 * `computeConfidence(journey, context?)` returns an explainable
 * {@link JourneyConfidence} (score + band + factors[]) — an explainable product
 * indicator, NOT a success probability (Requirement 6.4). `scoreToBand` maps a
 * score to its High/Medium/Low band using the design thresholds.
 */

export {
  computeConfidence,
  scoreToBand,
  BASE_CONFIDENCE,
  HIGH_THRESHOLD,
  MEDIUM_THRESHOLD,
} from "./confidenceIndicator";

export type { ConfidenceContext } from "./confidenceIndicator";

export {
  describeFactor,
  describeFactors,
  bandLabel,
  bandMeaning,
} from "./describeFactors";
export type { FactorSentence } from "./describeFactors";
