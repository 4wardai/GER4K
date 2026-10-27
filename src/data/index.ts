/**
 * GER4K data layer barrel.
 *
 * Re-exports the framework-free `DataProvider` interface so consumers can
 * `import type { DataProvider } from "@/data"`, plus the only runtime
 * implementation, `MockDataProvider` (a predictable local offline provider),
 * its shared singleton, a factory for isolated instances, and the fixtures.
 */

export type { DataProvider, MultimodalNetworkOptions } from "./DataProvider";

export {
  MockDataProvider,
  mockDataProvider,
  createMockDataProvider,
} from "./MockDataProvider";

export {
  demoNetwork,
  demoStations,
  demoDisruption,
  buildSeededReports,
  buildScenarioReports,
  conditionForReportType,
  STATION_IDS,
  LINE_IDS,
  DEMO_ORIGIN_ID,
  DEMO_DESTINATION_ID,
} from "./mock/fixture";

export { MULTIMODAL_LINE_IDS, walkLinks } from "./mock/multimodal";
export { lineInfo, nearbyServices, RAPID_KL_OPERATOR } from "./mock/lineInfo";
export type { NearbyService } from "./mock/lineInfo";
export { historicalDemandDataset } from "./mock/historicalDemand";
export { demoFareRules } from "./mock/fareRules";
