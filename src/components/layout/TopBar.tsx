"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/components/ui";

import { isNavActive, NAV_ITEMS } from "./BottomNavigation";
import { Ger4kMark } from "./Ger4kMark";

/** Desktop top bar (≥1024px): brand + the same four primary destinations. */
export default function TopBar() {
  const pathname = usePathname() ?? "/";
  return (
    <header className="sticky top-0 z-40 hidden h-16 items-center border-b border-border bg-surface/95 backdrop-blur-sm lg:flex">
      <div className="flex w-full items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet" aria-label="GER4K home">
          <Ger4kMark className="size-8" />
          <span className="text-[20px] font-extrabold tracking-tight text-foreground">GER4K</span>
          <span className="hidden text-caption font-medium text-foreground-muted xl:inline">Klang Valley journeys</span>
        </Link>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-body font-semibold outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-violet",
                      active ? "bg-violet/10 text-violet" : "text-foreground-muted hover:bg-navy-800 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
