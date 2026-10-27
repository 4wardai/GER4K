"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bookmark, Home, TrainTrack, type LucideIcon } from "lucide-react";

import { cn } from "@/components/ui";

/*
 * GER4K primary navigation (Requirement 34.1): Home · Pulse · Service · Saved.
 * Fewer than five items, NO AI tab (Ask GER4K is contextual), and Presenter
 * Control is never part of it. Mobile renders a fixed bottom bar; desktop uses
 * the same items in the TopBar.
 */

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that should highlight this tab. */
  also?: string[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Home", icon: Home, also: ["/journey"] },
  { href: "/pulse", label: "Pulse", icon: Activity },
  { href: "/service", label: "Service", icon: TrainTrack },
  { href: "/profile", label: "Saved", icon: Bookmark },
];

export function isNavActive(pathname: string, item: NavItem): boolean {
  const match = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return match(item.href) || (item.also ?? []).some(match);
}

export default function BottomNavigation() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_12px_rgba(17,24,39,0.06)] backdrop-blur-sm lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around gap-1 px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-2",
                  "transition-colors duration-150 ease-out outline-none",
                  "focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  active ? "text-violet" : "text-foreground-muted hover:text-foreground",
                )}
              >
                <Icon className="size-6 shrink-0" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                <span className="text-[13px] font-semibold leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
