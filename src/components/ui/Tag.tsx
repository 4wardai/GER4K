import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

/**
 * Tag (a.k.a. Chip) — a small pill for labels and SECONDARY metadata.
 *
 * This is the GENERIC primitive that later domain components (SourceStatusTag,
 * transit-line chips, etc.) compose on top of. Tags are intentionally QUIET on
 * the light theme — soft tinted fills, no harsh borders — so source/status
 * metadata stays available without dominating the primary UI.
 *
 * Design rule honoured: "label + icon, never color alone." A `tone` sets the
 * colour, but callers should pass an `icon` and/or text so meaning never relies
 * on colour perception alone.
 */
export type TagTone =
  | "neutral"
  | "violet"
  | "cyan"
  | "success"
  | "warning"
  | "critical";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone;
  /** Optional leading icon (e.g. a Lucide icon element). */
  icon?: ReactNode;
  children?: ReactNode;
}

/**
 * Soft, low-contrast tinted fills on white — a quiet accent, not a loud block.
 * Text uses the solid token colour for legibility; neutral is a plain grey chip.
 */
const tones: Record<TagTone, string> = {
  neutral: "bg-navy-800 text-foreground-muted",
  violet: "bg-violet/10 text-violet",
  cyan: "bg-cyan/10 text-cyan",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-[#B45309]",
  critical: "bg-critical/10 text-critical",
};

export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag(
  { tone = "neutral", icon, className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 " +
          "text-caption font-medium leading-none",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {icon ? (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
});
