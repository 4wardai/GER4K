import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

import { cn } from "./cn";

/**
 * Divider — a hairline separator using the border token.
 *
 * Supports horizontal (default) and vertical orientation. Rendered as an <hr>
 * when horizontal (semantic separator) and a decorative <div> when vertical.
 */
export interface DividerProps extends HTMLAttributes<HTMLElement> {
  orientation?: "horizontal" | "vertical";
}

export const Divider = forwardRef<HTMLElement, DividerProps>(function Divider(
  { orientation = "horizontal", className, ...rest },
  ref,
) {
  if (orientation === "vertical") {
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        role="separator"
        aria-orientation="vertical"
        className={cn("w-px self-stretch bg-border", className)}
        {...rest}
      />
    );
  }

  return (
    <hr
      ref={ref as React.Ref<HTMLHRElement>}
      className={cn("h-px w-full border-0 bg-border", className)}
      {...rest}
    />
  );
});
