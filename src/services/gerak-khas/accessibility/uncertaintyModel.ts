/**
 * Accessibility_Uncertainty_Model (NEW) — the smallest honest helper for the
 * AccessibilityTool. GER4K has no verified per-station lift/escalator/facility
 * dataset, so this never claims those facilities exist. It only reports the
 * GTFS `isOKU` step-free-access flag where present and is otherwise explicit
 * about the uncertainty.
 */

export interface AccessibilityAssessment {
  /** The GTFS OKU flag, when the station carries one. */
  okuFlag: boolean | null;
  /** A passenger-facing, honest uncertainty statement. */
  uncertainty: string;
}

const NO_LIVE_STATUS =
  "I don't have verified live lift, escalator or facility status — please check signage at the station.";

export function assessAccessibility(isOKU: boolean | undefined): AccessibilityAssessment {
  if (isOKU === true) {
    return {
      okuFlag: true,
      uncertainty: `This station is flagged step-free in official GTFS data. ${NO_LIVE_STATUS}`,
    };
  }
  if (isOKU === false) {
    return {
      okuFlag: false,
      uncertainty: `Official GTFS data does not flag this station as step-free. ${NO_LIVE_STATUS}`,
    };
  }
  return { okuFlag: null, uncertainty: NO_LIVE_STATUS };
}
