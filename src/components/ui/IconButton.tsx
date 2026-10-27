import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

/**
 * IconButton — a square, icon-only interactive primitive (e.g. close, back,
 * "ask" affordances). Purely presentational.
 *
 * Accessibility: because it has no visible text label, an `aria-label` is
 * REQUIRED by the prop type so screen-reader users always get a name. Keeps the
 * same focus-visible ring and large tap target rules as Button. Light theme.
 */
export type IconButtonVariant = "solid" | "ghost";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — icon-only controls must carry an accessible name. */
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  children: ReactNode;
}

const base =
  "inline-flex items-center justify-center rounded-xl font-sans " +
  "transition-all duration-150 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-navy " +
  "disabled:pointer-events-none disabled:opacity-50 active:translate-y-px";

const variants: Record<IconButtonVariant, string> = {
  solid:
    "bg-surface text-foreground border border-border shadow-sm shadow-black/5 hover:bg-navy-800",
  ghost:
    "bg-transparent text-foreground-muted hover:bg-navy-800 hover:text-foreground",
};

const sizes: Record<IconButtonSize, string> = {
  sm: "h-10 w-10",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { variant = "ghost", size = "md", type = "button", className, children, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variants[variant], sizes[size], className)}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
