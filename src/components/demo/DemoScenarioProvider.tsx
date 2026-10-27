"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

/**
 * Demo_Scenario shared state (task 5.1) — the single source of truth for whether
 * the presenter has ACTIVATED the predefined simulated disruption (Requirement
 * 4.1). When the Demo_Scenario is INACTIVE the app behaves as a normal day; when
 * ACTIVE, consumers (e.g. Home) apply the Disruption_Monitor so the baseline
 * journey becomes "affected".
 *
 * ── Why a React Context (not a store library) ──────────────────────────────
 * The project uses built-in React/Next state only — NO SWR/TanStack/Redux. The
 * active flag is a single boolean read by two sibling subtrees (PresenterControl
 * and Home), so a tiny Context + provider is the cleanest framework-light fit
 * and avoids prop-drilling across the layout. It is a CLIENT component; the
 * server `layout.tsx` simply renders it around `children` + `PresenterControl`.
 *
 * ── The active-gates-disruption decision (documented) ──────────────────────
 * We take the RECOMMENDED consumer-gating approach: `MockDataProvider` stays
 * pure and ALWAYS returns the fixture disruption. This context holds ONLY the
 * `active` flag. Consumers decide to apply disruption detection only when
 * `active` is true (Home evaluates impact via the Disruption_Monitor when
 * active, and treats the journey as a normal day when inactive). The provider is
 * never mutated, so "reset" is a pure state change back to a clean normal-day.
 */
export interface DemoScenarioContextValue {
  /** True when the presenter has activated the simulated Demo_Scenario. */
  active: boolean;
  /** Activate the Demo_Scenario (introduce the predefined simulated disruption). */
  activate: () => void;
  /** Reset the Demo_Scenario back to a clean normal-day state. */
  reset: () => void;
}

const DemoScenarioContext = createContext<DemoScenarioContextValue | null>(null);

export interface DemoScenarioProviderProps {
  children: ReactNode;
  /** Optional initial state; defaults to inactive (normal day). */
  initialActive?: boolean;
}

export function DemoScenarioProvider({
  children,
  initialActive = false,
}: DemoScenarioProviderProps) {
  const [active, setActive] = useState<boolean>(initialActive);

  const activate = useCallback(() => setActive(true), []);
  const reset = useCallback(() => setActive(false), []);

  const value = useMemo<DemoScenarioContextValue>(
    () => ({ active, activate, reset }),
    [active, activate, reset],
  );

  return (
    <DemoScenarioContext.Provider value={value}>
      {children}
    </DemoScenarioContext.Provider>
  );
}

/**
 * Read the shared Demo_Scenario state. Must be used within a
 * {@link DemoScenarioProvider} (mounted in `src/app/layout.tsx`); throws a clear
 * error otherwise so missing-provider mistakes surface immediately.
 */
export function useDemoScenario(): DemoScenarioContextValue {
  const ctx = useContext(DemoScenarioContext);
  if (ctx === null) {
    throw new Error(
      "useDemoScenario must be used within a <DemoScenarioProvider>. " +
        "It is mounted in src/app/layout.tsx around the app tree.",
    );
  }
  return ctx;
}
