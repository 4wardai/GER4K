import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "./cn";

/**
 * Button — the primary interactive primitive for GER4K.
 *
 * Purely presentational: it renders a native <button> and forwards every
 * standard button prop (onClick, type, disabled, aria-*, etc.) plus a ref.
 *
 * Light-theme / consumer design:
 *   - primary: solid indigo accent with white text + a soft shadow (the
 *     headline call to action).
 *   - secondary: white surface with a subtle border (quiet default action).
 *   - ghost: transparent, muted text (low-emphasis action).
 *   - Large tap targets (>=40/44/52px), a visible indigo focus ring offset on
 *     the light canvas, a 150ms microinteraction, and token-only colours.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** When true, the button stretches to the full width of its container. */
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-sans font-semibold " +
  "select-none whitespace-nowrap transition-all duration-150 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-navy " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "active:translate-y-px";

const variants: Record<ButtonVariant, string> = {
  // Indigo accent — the headline call to action.
  primary:
    "bg-violet text-white hover:bg-violet-light " +
    "shadow-sm shadow-violet/25",
  // White surface with a hairline border.
  secondary:
    "bg-surface text-foreground border border-border " +
    "hover:bg-navy-800 shadow-sm shadow-black/5",
  // Minimal transparent button for low-emphasis actions.
  ghost:
    "bg-transparent text-foreground-muted hover:bg-navy-800 " +
    "hover:text-foreground",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-3.5 text-caption",
  md: "h-11 px-5 text-body",
  lg: "h-12 px-6 text-body",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      type = "button",
      className,
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        // Default to type="button" so a Button inside a form never submits by
        // accident; callers can still pass type="submit".
        type={type}
        className={cn(
          base,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

