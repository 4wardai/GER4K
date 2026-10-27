"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useDemoScenario } from "@/components/demo";
import { useGer4kStore } from "@/components/state/Ger4kStore";

/**
 * PresenterControl — a compact, gated demo panel for the hackathon presenter,
 * floating in the TOP-RIGHT of the map.
 *
 * Passenger-facing controls are limited to the scenario state and a single
 * Reset. Developer-only actions (Clear local data, Dev detail) live inside a
 * small "Dev ⋯" overflow menu so normal passengers never see them.
 *
 * Gating (UNCHANGED): the panel only renders when at least one gate is
 * satisfied: `?presenter=1`, dev (`NODE_ENV === "development"`), or
 * `NEXT_PUBLIC_PRESENTER` = "1"/"true". Activation can be deep-linked with
 * `?presenter=1&scenario=active`.
 *
 * Styling is inline (resilient, independent of Tailwind purging) but tuned to
 * the LIGHT GER4K theme so it reads as a clean, discreet control.
 */
export default function PresenterControl() {
  const searchParams = useSearchParams();
  const { active, activate, reset } = useDemoScenario();
  const { clearLocalData, devMode, setDevMode } = useGer4kStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const gate = isPresenterGateSatisfied(searchParams);
  const autoActivate = gate && searchParams?.get("scenario") === "active";

  // Presenter rehearsal deep link: ?presenter=1&scenario=active starts the
  // simulated scenario on load. Gated exactly like the panel itself.
  useEffect(() => {
    if (autoActivate) activate();
  }, [autoActivate, activate]);

  // Close the dev menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (!gate) {
    return null;
  }

  return (
    <aside
      ref={panelRef}
      aria-label="Presenter control (demo only)"
      style={panelStyle}
      data-presenter-control=""
      data-scenario-active={active ? "true" : "false"}
    >
      <div style={rowStyle}>
        <span style={eyebrowStyle}>DEMO MODE</span>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Developer options"
            onFocus={applyFocusRing}
            onBlur={clearFocusRing}
            style={devToggleStyle}
          >
            Dev ⋯
          </button>
          {menuOpen ? (
            <div role="menu" style={menuStyle}>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={devMode}
                onClick={() => setDevMode(!devMode)}
                onFocus={applyFocusRing}
                onBlur={clearFocusRing}
                style={menuItemStyle}
                title="Show raw confidence factors and scores"
              >
                {devMode ? "✓ " : ""}Dev detail
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  reset();
                  clearLocalData();
                  setMenuOpen(false);
                }}
                onFocus={applyFocusRing}
                onBlur={clearFocusRing}
                style={{ ...menuItemStyle, color: "#b91c1c" }}
                title="Reset the scenario and clear saved journeys, points and own reports on this device"
              >
                Clear local data
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={active ? reset : activate}
        aria-pressed={active}
        onFocus={applyFocusRing}
        onBlur={clearFocusRing}
        title={active ? "Reset to a clean normal-day state" : "Introduce the predefined simulated disruption"}
        style={statusButtonStyle}
      >
        <span style={active ? dotActiveStyle : dotInactiveStyle} aria-hidden="true" />
        {active ? "Disruption active" : "Normal service"}
      </button>

      <button
        type="button"
        onClick={reset}
        disabled={!active}
        onFocus={applyFocusRing}
        onBlur={clearFocusRing}
        title="Reset the demo back to a clean normal-day state"
        style={active ? resetButtonStyle : resetDisabledStyle}
      >
        Reset
      </button>
    </aside>
  );
}

/**
 * Pure gate check so the logic is easy to reason about (and later test).
 * Accepts the resolved search params (or null when unavailable).
 */
export function isPresenterGateSatisfied(
  searchParams: URLSearchParams | null,
): boolean {
  const queryGate = searchParams?.get("presenter") === "1";
  const devGate = process.env.NODE_ENV === "development";
  const configGate =
    process.env.NEXT_PUBLIC_PRESENTER === "1" ||
    process.env.NEXT_PUBLIC_PRESENTER === "true";

  return queryGate || devGate || configGate;
}

// ── Inline styling (light GER4K theme) ──────────────────────────────────────

// Compact panel tucked top-right of the map, clear of the desktop top bar.
const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 76,
  right: 12,
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  width: 190,
  maxWidth: "calc(100vw - 24px)",
  padding: 10,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  background: "rgba(255, 255, 255, 0.96)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  boxShadow: "0 8px 24px rgba(17, 24, 39, 0.12)",
  font: "13px var(--font-inter, system-ui), sans-serif",
  color: "#64748b",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  color: "#8792a6",
};

const buttonBase: React.CSSProperties = {
  minHeight: 36,
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  font: "inherit",
  fontWeight: 600,
  lineHeight: 1.1,
  cursor: "pointer",
};

// The scenario toggle, shown as a status row with a dot.
const statusButtonStyle: React.CSSProperties = {
  ...buttonBase,
  display: "flex",
  alignItems: "center",
  gap: 8,
  justifyContent: "flex-start",
  background: "#ffffff",
  color: "#111827",
};

const dotBase: React.CSSProperties = {
  width: 9,
  height: 9,
  borderRadius: 999,
  flex: "0 0 auto",
};
const dotActiveStyle: React.CSSProperties = { ...dotBase, background: "#ef4444" };
const dotInactiveStyle: React.CSSProperties = { ...dotBase, background: "#16a34a" };

const resetButtonStyle: React.CSSProperties = {
  ...buttonBase,
  background: "#4f46e5",
  borderColor: "#4f46e5",
  color: "#ffffff",
};

const resetDisabledStyle: React.CSSProperties = {
  ...buttonBase,
  background: "#f7f8fa",
  color: "#94a3b8",
  cursor: "not-allowed",
};

const devToggleStyle: React.CSSProperties = {
  minHeight: 28,
  padding: "4px 8px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#64748b",
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 150,
  padding: 4,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  boxShadow: "0 8px 24px rgba(17, 24, 39, 0.16)",
};

const menuItemStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  font: "inherit",
  fontWeight: 600,
  color: "#475569",
  cursor: "pointer",
};

// Visible keyboard focus for the inline-styled buttons.
function applyFocusRing(event: React.FocusEvent<HTMLButtonElement>) {
  event.currentTarget.style.outline = "2px solid #4f46e5";
  event.currentTarget.style.outlineOffset = "2px";
}

function clearFocusRing(event: React.FocusEvent<HTMLButtonElement>) {
  event.currentTarget.style.outline = "";
  event.currentTarget.style.outlineOffset = "";
}
