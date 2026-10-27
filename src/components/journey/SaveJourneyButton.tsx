"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { Button, cn } from "@/components/ui";
import { Sheet } from "@/components/ui/Sheet";
import { useGer4kStore } from "@/components/state/Ger4kStore";
import { stationName } from "@/components/state/useLiveData";

const QUICK_LABELS = ["Work", "Home", "University", "Usual commute"];

/** Save a journey locally with a passenger label (Requirement 28). */
export function SaveJourneyButton({ originId, destinationId }: { originId: string; destinationId: string }) {
  const { isSaved, saveJourney, removeSaved } = useGer4kStore();
  const saved = isSaved(originId, destinationId);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("Work");

  return (
    <>
      <button
        type="button"
        onClick={() => (saved ? removeSaved(saved.id) : setOpen(true))}
        aria-pressed={!!saved}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-caption font-semibold transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet",
          saved ? "border-violet/40 bg-violet/10 text-violet" : "border-border bg-surface text-foreground hover:bg-navy-800",
        )}
      >
        <Star className={cn("size-4.5", saved && "fill-current")} aria-hidden="true" />
        {saved ? `Saved as ${saved.label}` : "Save journey"}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Save this journey"
        eyebrow={`${stationName(originId)} → ${stationName(destinationId)}`}
        footer={
          <Button
            size="lg"
            fullWidth
            onClick={() => {
              saveJourney(label, originId, destinationId);
              setOpen(false);
            }}
          >
            Save
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Quick labels">
            {QUICK_LABELS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={label === l}
                onClick={() => setLabel(l)}
                className={cn(
                  "h-10 rounded-full border px-3.5 text-caption font-semibold",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet",
                  label === l ? "border-foreground bg-foreground text-white" : "border-border bg-surface text-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-semibold text-foreground-muted">Name</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={40}
              className="h-12 rounded-xl border border-border px-3.5 text-body text-foreground focus-visible:border-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30"
            />
          </label>
          <p className="text-caption text-foreground-muted">
            Saved on this device only. GER4K will warn you here if this journey is disrupted.
          </p>
        </div>
      </Sheet>
    </>
  );
}
