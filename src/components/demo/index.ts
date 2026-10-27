/**
 * GER4K demo-scenario components barrel.
 *
 * Exposes the shared Demo_Scenario state (task 5.1): the provider mounted in
 * the root layout and the `useDemoScenario()` hook consumers read.
 */
export {
  DemoScenarioProvider,
  useDemoScenario,
} from "./DemoScenarioProvider";
export type {
  DemoScenarioContextValue,
  DemoScenarioProviderProps,
} from "./DemoScenarioProvider";
