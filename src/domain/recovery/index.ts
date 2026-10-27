/**
 * GER4K recovery domain barrel.
 *
 * Pure, framework-free Recovery_Engine exports. Consumers import from
 * `@/domain/recovery` rather than reaching into individual files.
 *
 * Two entry points exist:
 *   - `generateAlternatives` / `generateAlternativesOnNetwork` (task 7.1) just
 *     GENERATE avoiding alternatives and return a `Journey[]`.
 *   - `findRecovery` / `findRecoveryOnNetwork` (task 7.2) wrap generation with
 *     explicit avoid-VALIDATION (`journeyAvoidsBlocked`) and return a
 *     `RecoveryResult` discriminated union that makes the `NoAlternativeFound`
 *     case explicit. UI and ranking should prefer the `findRecovery*` entry.
 */

export {
  generateAlternatives,
  generateAlternativesOnNetwork,
  computeBlockedSegments,
  findRecovery,
  findRecoveryOnNetwork,
  isNoAlternativeFound,
  journeyAvoidsBlocked,
  journeySegments,
} from "./recoveryEngine";

export type {
  BlockedSegment,
  ExpandedSegment,
  RecoveryResult,
} from "./recoveryEngine";

export {
  rankAlternatives,
  rankWithPositions,
  rankingCosts,
  PROFILE_WEIGHTS,
} from "./rankingEngine";

export type { RankedPosition } from "./rankingEngine";
