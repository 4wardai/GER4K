import Link from "next/link";

import { cn } from "@/components/ui";

/**
 * SectionHeader — a section title with an optional right-aligned link
 * ("View all" / "Manage"). Keeps Home sections consistent and lets long lists
 * stay capped (Requirement 39.2). Purely presentational.
 */
export function SectionHeader({
  title,
  href,
  linkLabel,
  id,
  className,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <h2 id={id} className="text-title font-bold text-foreground">
        {title}
      </h2>
      {href && linkLabel ? (
        <Link
          href={href}
          className="rounded-lg text-caption font-semibold text-violet hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default SectionHeader;
