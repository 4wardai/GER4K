"use client";

import { memo } from "react";

import { cn } from "@/components/ui";
import type { RobotState } from "./robotState";
import { statusLightTone } from "./robotState";

/**
 * GerakKhasRobot — the original GER4K mobility companion, drawn as inline SVG
 * and animated with CSS only (no physics engine, no animation library).
 *
 * It is deliberately ORIGINAL: a rounded trapezoidal body on a soft hover pad,
 * a wide wrap-around visor with two expressive eyes, two small side modules,
 * an antenna status light, and a "G4" chest badge. It is not WALL-E, EVE,
 * Baymax, R2-D2 or any existing character.
 *
 * Every state reads BOTH through motion and a static indicator so it still
 * communicates under `prefers-reduced-motion` (handled in globals.css via the
 * `gk-reduce` fallbacks on these classes).
 */

export interface GerakKhasRobotProps {
  state: RobotState;
  /** px size of the square viewport. */
  size?: number;
  className?: string;
}

/** Eye shape per state (the primary expression surface). */
function eyeClass(state: RobotState): string {
  switch (state) {
    case "LISTENING":
      return "gk-eyes-listen";
    case "THINKING":
      return "gk-eyes-think";
    case "SUCCESS":
      return "gk-eyes-happy";
    case "SEVERE":
    case "DISRUPTION":
      return "gk-eyes-alert";
    default:
      return "gk-eyes-idle";
  }
}

function lightFill(state: RobotState): string {
  const tone = statusLightTone(state);
  if (tone === "red") return "var(--gk-severe, #EF4444)";
  if (tone === "amber") return "var(--gk-warn, #F59E0B)";
  return "var(--gk-accent, #4F46E5)";
}

export const GerakKhasRobot = memo(function GerakKhasRobot({
  state,
  size = 72,
  className,
}: GerakKhasRobotProps) {
  const light = lightFill(state);
  return (
    <span
      className={cn("gk-robot", `gk-state-${state.toLowerCase()}`, className)}
      style={{ width: size, height: size, display: "inline-block" }}
      data-state={state}
    >
      <svg
        viewBox="0 0 96 96"
        width={size}
        height={size}
        role="img"
        aria-label="Gerak Khas mobility companion"
      >
        {/* Hover pad / soft shadow base */}
        <ellipse className="gk-pad" cx="48" cy="86" rx="22" ry="5" fill="rgba(79,70,229,0.18)" />

        {/* Floating body group (bobs in IDLE) */}
        <g className="gk-float">
          {/* Antenna + status light */}
          <line x1="48" y1="16" x2="48" y2="7" stroke="#C7CBD9" strokeWidth="2.5" strokeLinecap="round" />
          <circle className="gk-light" cx="48" cy="6" r="4.5" fill={light} />

          {/* Side modules / arms */}
          <rect className="gk-arm gk-arm-l" x="12" y="46" width="10" height="20" rx="5" fill="#D7DBE6" />
          <rect className="gk-arm gk-arm-r" x="74" y="46" width="10" height="20" rx="5" fill="#D7DBE6" />

          {/* Body: rounded trapezoid capsule */}
          <path
            d="M30 34 H66 a10 10 0 0 1 10 10 V66 a12 12 0 0 1 -12 12 H32 a12 12 0 0 1 -12 -12 V44 a10 10 0 0 1 10 -10 Z"
            fill="#EEF0F6"
            stroke="#D7DBE6"
            strokeWidth="1.5"
          />

          {/* Head / wrap-around visor */}
          <rect x="26" y="20" width="44" height="26" rx="13" fill="#2A2F45" />
          <rect x="29" y="23" width="38" height="20" rx="10" fill="#1B2036" />

          {/* Eyes */}
          <g className={cn("gk-eyes", eyeClass(state))} fill={light}>
            <circle className="gk-eye gk-eye-l" cx="40" cy="33" r="5" />
            <circle className="gk-eye gk-eye-r" cx="56" cy="33" r="5" />
          </g>

          {/* Chest badge: subtle G4 identity */}
          <rect x="40" y="54" width="16" height="13" rx="4" fill="#fff" stroke="#D7DBE6" strokeWidth="1" />
          <text x="48" y="63.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#4F46E5" fontFamily="var(--font-inter, sans-serif)">
            G4
          </text>

          {/* Wheel / hovering base */}
          <rect className="gk-base" x="34" y="78" width="28" height="7" rx="3.5" fill="#C7CBD9" />
        </g>
      </svg>
    </span>
  );
});

export default GerakKhasRobot;
