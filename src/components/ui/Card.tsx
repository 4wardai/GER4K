import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

/**
 * Card family — the white-surface container primitive.
 *
 * GER4K layout sits on a soft light canvas. `Card` provides a white surface
 * with a subtle hairline border, rounded corners and a soft shadow. Elevation
 * comes from shadow depth (both surfaces are white), not a darker fill.
 * `CardHeader`, `CardContent` and `CardFooter` give consistent internal padding.
 *
 * All parts are purely presentational, forward refs and spread native div
 * props, so callers can add aria attributes, roles, handlers, etc.
 */
export type CardElevation = "flat" | "raised";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `raised` reads as a stronger soft shadow for cards that sit above others. */
  elevation?: CardElevation;
  /** When true, adds a subtle hover lift for interactive cards. */
  interactive?: boolean;
  children?: ReactNode;
}

const surfaces: Record<CardElevation, string> = {
  flat: "bg-surface shadow-sm shadow-black/5",
  raised: "bg-surface shadow-md shadow-black/[0.06]",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { elevation = "flat", interactive = false, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-border",
        surfaces[elevation],
        interactive &&
          "transition-all duration-150 ease-out hover:border-violet/40 " +
            "hover:shadow-md hover:shadow-black/[0.08] focus-within:border-violet/40",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

export interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Header region — slightly tighter bottom padding to sit above content. */
export const CardHeader = forwardRef<HTMLDivElement, CardSectionProps>(
  function CardHeader({ className, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-1 px-5 pt-5 pb-2 sm:px-6", className)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

/** Main content region with comfortable padding at both viewports. */
export const CardContent = forwardRef<HTMLDivElement, CardSectionProps>(
  function CardContent({ className, children, ...rest }, ref) {
    return (
      <div ref={ref} className={cn("px-5 py-4 sm:px-6", className)} {...rest}>
        {children}
      </div>
    );
  },
);

/** Footer region — actions / meta row, separated by a hairline top border. */
export const CardFooter = forwardRef<HTMLDivElement, CardSectionProps>(
  function CardFooter({ className, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 border-t border-border px-5 py-4 sm:px-6",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
