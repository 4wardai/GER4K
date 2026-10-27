/**
 * GER4K disruption domain barrel.
 *
 * Pure, framework-free disruption impact detection exports. Consumers import
 * from `@/domain/disruption` rather than reaching into individual files.
 */

export {
  evaluateImpact,
  evaluateImpactViaProvider,
} from "./disruptionMonitor";
