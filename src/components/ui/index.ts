/**
 * GER4K base UI primitives (task 1.4).
 *
 * A small, cohesive set of PURELY PRESENTATIONAL building blocks that later
 * vertical slices compose into domain components (SourceStatusTag,
 * ConfidenceBadge, RecoveryOptionCard, StationPulseCard, ...). Everything here
 * uses the GER4K design tokens from globals.css — no hardcoded colors — and is
 * usable/responsive at 390px and ~1280px.
 *
 * Import from the barrel, e.g.:
 *   import { Button, Card, CardHeader, Tag, Badge } from "@/components/ui";
 */
export { cn } from "./cn";
export type { ClassValue } from "./cn";

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { IconButton } from "./IconButton";
export type {
  IconButtonProps,
  IconButtonVariant,
  IconButtonSize,
} from "./IconButton";

export { Card, CardHeader, CardContent, CardFooter } from "./Card";
export type {
  CardProps,
  CardSectionProps,
  CardElevation,
} from "./Card";

export { Tag } from "./Tag";
export type { TagProps, TagTone } from "./Tag";

export { Badge } from "./Badge";
export type { BadgeProps, BadgeTone, BadgeShape } from "./Badge";

export { Heading, Text, SectionTitle } from "./Text";
export type {
  HeadingProps,
  HeadingLevel,
  HeadingTag,
  TextProps,
  TextSize,
  TextTone,
  SectionTitleProps,
} from "./Text";

export { Divider } from "./Divider";
export type { DividerProps } from "./Divider";
