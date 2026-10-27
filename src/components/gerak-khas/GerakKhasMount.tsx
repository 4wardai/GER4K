"use client";

import { GerakKhasLauncher } from "./GerakKhasLauncher";
import { GerakKhasRuntime } from "./GerakKhasRuntime";

/**
 * GerakKhasMount — the floating robot launcher plus the orchestrator-backed
 * chat runtime, mounted once globally (in layout) so the companion is on every
 * screen WITHOUT replacing GER4K's own UI (Requirement 7).
 */
export function GerakKhasMount() {
  return (
    <>
      <GerakKhasLauncher />
      <GerakKhasRuntime />
    </>
  );
}

export default GerakKhasMount;
