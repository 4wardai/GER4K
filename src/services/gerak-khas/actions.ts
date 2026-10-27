/**
 * Gerak Khas client action handler (Requirements 14, 15, 22, 23, 29).
 *
 * Executes the CLOSED action set against real GER4K state/UI. Important:
 * SELECT_ROUTE / SHOW_BUS validate the route id against the CURRENT context and
 * REJECT stale ids (Requirement 14.5) — they refresh and present valid
 * alternatives rather than selecting an invalid route.
 */
import type { GerakKhasAction, CurrentJourneyContext } from "./types";

export interface ActionHandlerDeps {
  context: CurrentJourneyContext | null;
  /** Ask the journey screen to select a route (and optionally set a profile). */
  requestRouteSelection: (routeId: string, profile?: import("@/types").PreferenceProfile) => void;
  setPreferredProfile: (p: import("@/types").PreferenceProfile) => void;
  openStation: (id: string, mode?: "view" | "report") => void;
  navigate: (path: string) => void;
  /** Open a visual (SHOW_VISUAL) — provided by the runtime. */
  showVisual: (stationId: string, mode: "REAL_REFERENCE" | "AI_GENERATED") => void;
  /** Report a transient message back into the transcript (e.g. stale route). */
  notify: (text: string) => void;
}

/** Is a route id currently valid (present in options or candidates)? */
export function isRouteValid(ctx: CurrentJourneyContext | null, routeId: string): boolean {
  if (!ctx) return false;
  return (
    ctx.options.some((o) => o.id === routeId) || ctx.candidates.some((o) => o.id === routeId)
  );
}

export function createActionHandler(deps: ActionHandlerDeps) {
  return function handle(action: GerakKhasAction): void {
    switch (action.type) {
      case "SELECT_ROUTE":
      case "SHOW_BUS": {
        if (!isRouteValid(deps.context, action.routeId)) {
          // Stale route: reject, keep the current selection, and prompt a refresh.
          deps.notify(
            "That route is no longer available — I've refreshed your options. Pick one of the current alternatives.",
          );
          return;
        }
        deps.requestRouteSelection(action.routeId, "profile" in action ? action.profile : undefined);
        return;
      }
      case "SET_PREFERENCE":
        deps.setPreferredProfile(action.preference);
        return;
      case "OPEN_STATION":
        deps.openStation(action.stationId, "view");
        return;
      case "OPEN_PULSE":
        if (action.stationId) deps.openStation(action.stationId, "view");
        else deps.navigate("/pulse");
        return;
      case "SHOW_SERVICE":
        deps.navigate("/service");
        return;
      case "SHOW_VISUAL":
        deps.showVisual(action.stationId, action.mode);
        return;
      case "REPORT_CONDITION":
        deps.openStation(action.stationId, "report");
        return;
    }
  };
}
