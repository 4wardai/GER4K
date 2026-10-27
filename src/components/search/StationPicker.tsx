"use client";

import { useMemo, useState } from "react";
import { Clock, MapPin, Search, Star } from "lucide-react";

import { demoStations } from "@/data";
import type { Station } from "@/types";
import { cn } from "@/components/ui";
import { Sheet } from "@/components/ui/Sheet";
import { LineBadge } from "@/components/transit/TransitBits";
import { useGer4kStore } from "@/components/state/Ger4kStore";

/**
 * StationPicker — large, keyboard-accessible station search (Requirement 20.2)
 * with recent and saved places first, then every station with its lines.
 */
export function StationPicker({
  open,
  title,
  excludeId,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  excludeId?: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const { recents, saved } = useGer4kStore();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matches = (s: Station) =>
    !q || s.name.toLowerCase().includes(q) || (s.codes ?? []).some((c) => c.toLowerCase().includes(q));

  const quick = useMemo(() => {
    const ids: Array<{ id: string; kind: "saved" | "recent"; note: string }> = [];
    const push = (id: string, kind: "saved" | "recent", note: string) => {
      if (id !== excludeId && !ids.some((x) => x.id === id)) ids.push({ id, kind, note });
    };
    for (const s of saved) {
      push(s.destinationId, "saved", s.label);
      push(s.originId, "saved", s.label);
    }
    for (const r of recents) {
      push(r.destinationId, "recent", "Recent");
      push(r.originId, "recent", "Recent");
    }
    return ids.slice(0, 4);
  }, [saved, recents, excludeId]);

  const all = demoStations
    .filter((s) => s.id !== excludeId && matches(s))
    .sort((a, b) => a.name.localeCompare(b.name));

  function pick(id: string) {
    setQuery("");
    onPick(id);
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <label className="relative block">
          <span className="sr-only">Search stations</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-foreground-subtle" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search station or code (e.g. KLCC, KG20)"
            className="h-12 w-full rounded-xl border border-border bg-navy-800/50 pl-11 pr-3 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30"
          />
        </label>

        {!q && quick.length > 0 ? (
          <section aria-label="Saved and recent">
            <h3 className="mb-1.5 text-caption font-semibold text-foreground-muted">Saved &amp; recent</h3>
            <ul className="flex flex-col">
              {quick.map((x) => {
                const s = demoStations.find((st) => st.id === x.id);
                if (!s) return null;
                return (
                  <li key={`${x.kind}-${x.id}`}>
                    <PickerRow station={s} onPick={pick} note={x.note} icon={x.kind === "saved" ? "saved" : "recent"} />
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section aria-label="All stations">
          <h3 className="mb-1.5 text-caption font-semibold text-foreground-muted">
            {q ? `${all.length} station${all.length === 1 ? "" : "s"}` : "All stations"}
          </h3>
          {all.length === 0 ? (
            <p className="py-6 text-center text-body text-foreground-muted">
              No station matches &ldquo;{query}&rdquo;. GER4K covers a focused set of central Klang Valley stations in this prototype.
            </p>
          ) : (
            <ul className="flex flex-col">
              {all.map((s) => (
                <li key={s.id}>
                  <PickerRow station={s} onPick={pick} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Sheet>
  );
}

function PickerRow({
  station,
  onPick,
  note,
  icon = "station",
}: {
  station: Station;
  onPick: (id: string) => void;
  note?: string;
  icon?: "station" | "saved" | "recent";
}) {
  const Icon = icon === "saved" ? Star : icon === "recent" ? Clock : MapPin;
  return (
    <button
      type="button"
      onClick={() => onPick(station.id)}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left",
        "hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-800 text-foreground-muted">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body font-semibold text-foreground">{station.name}</span>
        {note ? <span className="text-caption text-foreground-muted">{note}</span> : null}
      </span>
      <span className="flex shrink-0 flex-wrap justify-end gap-1">
        {station.lines.map((l) => (
          <LineBadge key={l} leg={{ lineId: l, mode: "", walkMeters: 0 }} />
        ))}
      </span>
    </button>
  );
}

export default StationPicker;
