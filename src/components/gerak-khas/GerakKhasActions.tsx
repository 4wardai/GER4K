"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui";
import type { GerakKhasAction } from "@/services/gerak-khas/types";

/**
 * GerakKhasActions — renders the structured action buttons for a response
 * (Requirement 9.3). Behaviour lives in data, not prose: each button hands its
 * typed action to the handler, which executes it against real GER4K state.
 */
export function GerakKhasActions({
  actions,
  onAction,
}: {
  actions: GerakKhasAction[];
  onAction?: (action: GerakKhasAction) => void;
}) {
  if (actions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a, i) => (
        <Button
          key={`${a.type}-${i}`}
          size="sm"
          variant={i === 0 ? "primary" : "secondary"}
          onClick={() => onAction?.(a)}
        >
          {a.label}
          {i === 0 ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
        </Button>
      ))}
    </div>
  );
}

export default GerakKhasActions;
