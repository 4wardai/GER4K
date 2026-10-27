/**
 * Gerak Khas quick prompts (Requirement 6).
 *
 * The six contextual quick actions. `routeDependent` ones are hidden when no
 * route is in context (Phase 1 uses local/prototype state for this; Phase 2's
 * journey context bridge supplies the real signal). Pure data + a tiny helper,
 * so it is unit-testable without React.
 */

export interface QuickPrompt {
  label: string;
  question: string;
  routeDependent: boolean;
}

export const QUICK_PROMPTS: QuickPrompt[] = [
  { label: "Why this route?", question: "Why this route?", routeDependent: true },
  { label: "Bus alternative", question: "Is there a bus option?", routeDependent: true },
  { label: "Less walking", question: "Which route has less walking?", routeDependent: true },
  { label: "Avoid crowds", question: "I don't want packed stations.", routeDependent: true },
  { label: "Fare", question: "What's the fare?", routeDependent: true },
  { label: "Station info", question: "Tell me about this station.", routeDependent: false },
];

/** The quick prompts to show given whether a route is in context. */
export function visibleQuickPrompts(hasRoute: boolean): QuickPrompt[] {
  return QUICK_PROMPTS.filter((p) => (p.routeDependent ? hasRoute : true));
}
