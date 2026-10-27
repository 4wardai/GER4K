/**
 * Gerak Khas robot state resolver — PURE and framework-free (Requirement 2).
 *
 * The visible robot state is derived deterministically from co-pilot activity
 * plus the current disruption severity. Severity comes from the Context_Model
 * in later phases; in Phase 1 it is always "none". SEVERE takes precedence over
 * DISRUPTION (Requirement 2.6). No React, no timers here — the component maps a
 * state to CSS classes and plays SUCCESS once per delivered response.
 */

export type RobotState =
  | "IDLE"
  | "LISTENING"
  | "THINKING"
  | "SUCCESS"
  | "DISRUPTION"
  | "SEVERE";

/** Disruption severity surfaced to the robot (from the Context_Model). */
export type RobotSeverity = "none" | "moderate" | "severe";

/** Transient co-pilot activity that outranks a steady disruption light. */
export type RobotActivity = "idle" | "listening" | "thinking" | "success";

export interface RobotStateInput {
  /** Current transient activity (input focus, awaiting a response, etc.). */
  activity: RobotActivity;
  /** Disruption severity from the current journey context. */
  severity: RobotSeverity;
}

/**
 * Resolve the single robot state to display.
 *
 * Precedence: an ACTIVE conversation beat (listening/thinking/success) is the
 * most informative thing to show, so it wins. Otherwise a severe disruption
 * (red) outranks a moderate one (amber), which outranks the resting IDLE state.
 * Given the same input this always returns the same state (deterministic).
 */
export function resolveRobotState({ activity, severity }: RobotStateInput): RobotState {
  if (activity === "listening") return "LISTENING";
  if (activity === "thinking") return "THINKING";
  if (activity === "success") return "SUCCESS";
  if (severity === "severe") return "SEVERE";
  if (severity === "moderate") return "DISRUPTION";
  return "IDLE";
}

/** The status-light colour token for a state (amber/red for disruptions). */
export function statusLightTone(state: RobotState): "normal" | "amber" | "red" {
  if (state === "SEVERE") return "red";
  if (state === "DISRUPTION") return "amber";
  return "normal";
}
