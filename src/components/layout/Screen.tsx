import type { ReactNode } from "react";

import AppShell from "./AppShell";

/*
 * Screen — every page renders inside the same frame (top bar on desktop,
 * bottom navigation on mobile). The gated PresenterControl and global overlays
 * stay mounted in the root layout.
 */
export interface ScreenProps {
  children: ReactNode;
  variant?: "page" | "full";
  className?: string;
}

export default function Screen({ children, variant = "page", className }: ScreenProps) {
  return (
    <AppShell variant={variant} className={className}>
      {children}
    </AppShell>
  );
}
