import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

/**
 * Badge — a compact emphasis marker for counts, scores, and bands.
 *
 * Generic primitive that later domain components (e.g. ConfidenceBadge) build
 * on. Two shapes:
 *   - `pill`  (default) for short labels / bands like "High" or counts.
 *   - `dot`   a tiny status indicator; pair it with adjacent text so meaning is
 *             not conveyed by colour alone.
 *
 * Light-theme fills: solid status colours carry white text; neutral is a soft
 * grey chip. Restrained so a badge reads as emphasis without shouting.
 */
export type BadgeTone =
  | "neutral"
  | "violet"
  | "cyan"
  | "success"
  | "warning"
  | "critical";
export type BadgeShape = "pill" | "dot";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  shape?: BadgeShape;
  children?: ReactNode;
}

const pillTones: Record<BadgeTone, string> = {
  neutral: "bg-navy-800 text-foreground-muted",
  violet: "bg-violet text-white",
  cyan: "bg-cyan text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  critical: "bg-critical text-white",
};

const dotTones: Record<BadgeTone, string> = {
  neutral: "bg-foreground-subtle",
  violet: "bg-violet",
  cyan: "bg-cyan",
  success: "bg-success",
  warning: "bg-warning",
  critical: "bg-critical",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = "neutral", shape = "pill", className, children, ...rest },
  ref,
) {
  if (shape === "dot") {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
          dotTones[tone],
          className,
        )}
        {...rest}
      />
    );
  }

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex min-w-5 items-center justify-center gap-1 rounded-full " +
          "px-2.5 py-1 text-caption font-semibold leading-none",
        pillTones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
});
