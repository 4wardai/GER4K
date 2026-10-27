import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

/**
 * Typography helpers — thin wrappers over the GER4K type-scale tokens
 * (text-display / text-heading / text-title / text-body / text-caption) so
 * views get a consistent hierarchy without repeating class strings.
 *
 * These are presentational only. `Heading` renders a semantic heading element
 * (defaults to <h2>) with the matching type size; callers pick the correct
 * `as` level for document outline correctness. `Text` renders body/caption
 * copy with a selectable foreground tone.
 */

export type HeadingLevel = "display" | "heading" | "title";
export type HeadingTag = "h1" | "h2" | "h3" | "h4";

const headingSizes: Record<HeadingLevel, string> = {
  display: "text-display font-semibold tracking-tight",
  heading: "text-heading font-semibold tracking-tight",
  title: "text-title font-semibold",
};

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Visual size from the type scale. */
  level?: HeadingLevel;
  /** Semantic element — choose for correct document outline. Defaults to h2. */
  as?: HeadingTag;
  children?: ReactNode;
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  function Heading({ level = "title", as, className, children, ...rest }, ref) {
    // Sensible default element per level, overridable via `as`.
    const Tag = (as ?? defaultTagForLevel(level)) as HeadingTag;
    return (
      <Tag
        ref={ref}
        className={cn("font-sans text-foreground", headingSizes[level], className)}
        {...rest}
      >
        {children}
      </Tag>
    );
  },
);

function defaultTagForLevel(level: HeadingLevel): HeadingTag {
  switch (level) {
    case "display":
      return "h1";
    case "heading":
      return "h2";
    case "title":
    default:
      return "h3";
  }
}

export type TextSize = "body" | "caption";
export type TextTone = "default" | "muted" | "subtle";

const textSizes: Record<TextSize, string> = {
  body: "text-body",
  caption: "text-caption",
};

const textTones: Record<TextTone, string> = {
  default: "text-foreground",
  muted: "text-foreground-muted",
  subtle: "text-foreground-subtle",
};

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  size?: TextSize;
  tone?: TextTone;
  /** Render as a <span> instead of a <p> for inline usage. */
  inline?: boolean;
  children?: ReactNode;
}

export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  { size = "body", tone = "default", inline = false, className, children, ...rest },
  ref,
) {
  const classes = cn("font-sans", textSizes[size], textTones[tone], className);

  if (inline) {
    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        className={classes}
        {...rest}
      >
        {children}
      </span>
    );
  }

  return (
    <p
      ref={ref as React.Ref<HTMLParagraphElement>}
      className={classes}
      {...rest}
    >
      {children}
    </p>
  );
});

/**
 * SectionTitle — a small uppercase label for grouping sections (e.g. "Recovery
 * options", "Station Pulse"). Uses the caption scale with tracking for a quiet,
 * structural feel.
 */
export interface SectionTitleProps
  extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

export const SectionTitle = forwardRef<HTMLParagraphElement, SectionTitleProps>(
  function SectionTitle({ className, children, ...rest }, ref) {
    return (
      <p
        ref={ref}
        className={cn(
          "font-sans text-caption font-semibold uppercase tracking-wider " +
            "text-foreground-subtle",
          className,
        )}
        {...rest}
      >
        {children}
      </p>
    );
  },
);
