import type { ReactNode } from "react";

import BottomNavigation from "./BottomNavigation";
import TopBar from "./TopBar";

/*
 * GER4K app shell (Requirement 34).
 *
 *  - ≥1024px: a sticky top bar with the four primary destinations.
 *  - <1024px: a fixed bottom navigation bar; content reserves space for it.
 *  - `variant="page"`: centred content up to 1200px (Pulse, Service, Saved).
 *  - `variant="full"`: full-bleed for map surfaces (Home, Journey).
 */

const NAV_RESERVE = "pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0";

export interface AppShellProps {
  children: ReactNode;
  variant?: "page" | "full";
  className?: string;
}

export default function AppShell({ children, variant = "page", className = "" }: AppShellProps) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-navy text-foreground">
      <TopBar />
      <main
        className={[
          "w-full flex-1",
          variant === "page" ? "mx-auto max-w-[1200px] px-4 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8" : "",
          NAV_RESERVE,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </main>
      <BottomNavigation />
    </div>
  );
}
