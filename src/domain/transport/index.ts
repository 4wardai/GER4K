/**
 * GER4K transport domain barrel.
 *
 * Pure, framework-free transport planning exports. Consumers import from
 * `@/domain/transport` rather than reaching into individual files.
 */

export {
  planJourney,
  planJourneyOnNetwork,
  isNoRouteFound,
} from "./journeyPlanner";

export type {
  PlanResult,
  PlanJourneyOptions,
} from "./journeyPlanner";
