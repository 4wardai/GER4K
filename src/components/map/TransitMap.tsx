"use client";

import { useMemo } from "react";

import { demoStations, lineInfo, LINE_IDS, MULTIMODAL_LINE_IDS, STATION_IDS } from "@/data";
import type {
  Disruption,
  Journey,
  StationCondition,
  StationPulseDetail,
} from "@/types";
import { cn } from "@/components/ui";
import { lineInfoFor } from "@/components/transit/lineStyle";

import {
  BREAK_Y,
  LABELS,
  legPoints,
  linePoints,
  midpoint,
  pointAlongLine,
  STATION_POS,
  straight,
  toSmoothPath,
  VIEW,
} from "./mapLayout";
import type { Pt } from "./mapLayout";

/**
 * TransitMap — offline SVG schematic (Requirements 17, 38). No tiles, no
 * network. Polished presentation:
 *
 *  - Smooth curved route paths; slightly thinner base lines.
 *  - The selected/recommended route has the strongest opacity; unselected
 *    network lines are significantly muted; other options sit in between.
 *  - Tiered station labels: route stations strong, interchanges/anchors medium,
 *    unrelated stations hidden while a route is focused.
 *  - ONE disruption marker: a single red ✕ with a "Disrupted" tag on a
 *    broken/dashed red segment.
 *  - Small line badges (e.g. "PYL · MRT Putrajaya") near the relevant segments.
 *  - Legend lists the transport LINES visible on the map (never "GTFS"); the
 *    Pulse condition key is a separate, clearly-labelled block.
 */

const RAIL_LINES = [LINE_IDS.putrajaya, LINE_IDS.kajang, LINE_IDS.kelanaJaya, LINE_IDS.ampangSriPetaling];

/** Stations always worth labelling even when unrelated to the route (interchanges + anchors). */
const ALWAYS_LABEL = new Set<string>([
  STATION_IDS.klcc,
  STATION_IDS.trx,
  STATION_IDS.pasarSeni,
  STATION_IDS.masjidJamek,
  STATION_IDS.ampangPark,
  STATION_IDS.putrajayaSentral,
]);

/** Where a line's small badge sits along its geometry (0..1). */
const BADGE_FRACTION: Record<string, number> = {
  [LINE_IDS.putrajaya]: 0.28,
  [LINE_IDS.kajang]: 0.5,
  [LINE_IDS.kelanaJaya]: 0.4,
  [LINE_IDS.ampangSriPetaling]: 0.5,
};

export interface TransitMapProps {
  selected?: Journey | null;
  others?: Journey[];
  disruptions?: Disruption[];
  pulse?: Map<string, StationPulseDetail>;
  /** Show the simulated replacement bus line in the base network. */
  scenarioServices?: boolean;
  /** Draw a rail + ride-hail preview (from hail station to destination). */
  rideHail?: { hailStationId: string; destinationId: string; railJourney: Journey } | null;
  onStationClick?: (stationId: string) => void;
  className?: string;
  /** Accessible summary of what the map shows. */
  label: string;
}

function legLineId(leg: Journey["legs"][number]): string | undefined {
  return leg.lineId ?? lineInfoFor(leg.line)?.lineId;
}

function legColour(leg: Journey["legs"][number]): string {
  if (leg.legKind === "walk") return "#64748B";
  return lineInfoFor(legLineId(leg))?.colour ?? "#0284C7";
}

function journeyStrokes(j: Journey): Array<{ d: string; colour: string; kind: "ride" | "walk"; lineId?: string }> {
  return j.legs.map((leg) => {
    if (leg.legKind === "walk") {
      return { d: toSmoothPath(straight(leg.from, leg.to)), colour: "#64748B", kind: "walk" as const };
    }
    const lineId = legLineId(leg);
    const pts = lineId ? legPoints(lineId, leg.from, leg.to) : straight(leg.from, leg.to);
    return { d: toSmoothPath(pts), colour: legColour(leg), kind: "ride" as const, lineId };
  });
}

function journeyStationIds(j: Journey): Set<string> {
  const s = new Set<string>();
  for (const leg of j.legs) {
    s.add(leg.from);
    s.add(leg.to);
  }
  return s;
}

const PULSE_FILL: Record<StationCondition, string> = {
  Normal: "#16A34A",
  Busy: "#F59E0B",
  Packed: "#EF4444",
  "Severe disruption": "#B91C1C",
};

function PulseMarker({ at, condition }: { at: Pt; condition: StationCondition }) {
  const x = at.x + 14;
  const y = at.y - 14;
  const fill = PULSE_FILL[condition];
  if (condition === "Normal") return <circle cx={x} cy={y} r={6} fill={fill} stroke="#fff" strokeWidth={2} />;
  if (condition === "Busy")
    return <rect x={x - 5.5} y={y - 5.5} width={11} height={11} transform={`rotate(45 ${x} ${y})`} fill={fill} stroke="#fff" strokeWidth={2} />;
  // Packed / Severe share one square treatment; the single disruption ✕ is
  // reserved for the disrupted segment marker so reds don't compete.
  return <rect x={x - 6} y={y - 6} width={12} height={12} rx={3} fill={fill} stroke="#fff" strokeWidth={2} />;
}

/** A small line badge near a segment, e.g. "PYL · MRT Putrajaya". */
function LineBadgeMark({ at, code, name, colour, textColour }: { at: Pt; code: string; name: string; colour: string; textColour: string }) {
  const text = `${code} · ${name}`;
  const width = 30 + text.length * 7.6;
  return (
    <g transform={`translate(${at.x - width / 2}, ${at.y - 13})`} aria-hidden="true">
      <rect width={width} height={26} rx={13} fill="#FFFFFF" stroke="#E5E7EB" strokeWidth={1} opacity={0.96} />
      <circle cx={16} cy={13} r={6.5} fill={colour} />
      <text x={16} y={16.5} textAnchor="middle" fontSize={8.5} fontWeight={800} fill={textColour}>
        {code.length <= 3 ? code : code.slice(0, 3)}
      </text>
      <text x={30} y={17} fontSize={13} fontWeight={600} fill="#334155">
        {code} · {name}
      </text>
    </g>
  );
}

export function TransitMap({
  selected,
  others = [],
  disruptions = [],
  pulse,
  scenarioServices = false,
  rideHail,
  onStationClick,
  className,
  label,
}: TransitMapProps) {
  const focusIds = useMemo(() => (selected ? journeyStationIds(selected) : new Set<string>()), [selected]);
  const hasFocus = !!selected || !!rideHail;
  const baseLines = [
    ...RAIL_LINES,
    MULTIMODAL_LINE_IDS.bus300,
    ...(scenarioServices ? [MULTIMODAL_LINE_IDS.replacementBus] : []),
  ];

  const origin = selected?.legs[0]?.from ?? rideHail?.railJourney.legs[0]?.from;
  const destination = selected?.legs[selected.legs.length - 1]?.to ?? rideHail?.destinationId;

  // Legend: the rail lines actually drawn, in official colours.
  const legendLines = RAIL_LINES.map((id) => lineInfo.find((l) => l.lineId === id)).filter(
    (l): l is NonNullable<typeof l> => !!l,
  );

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-[#EEF2F7]", className)}>
      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="group"
        aria-label={label}
      >
        <defs>
          <pattern id="ger4k-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="#D5DCE6" />
          </pattern>
        </defs>
        <rect x={0} y={0} width={VIEW.w} height={VIEW.h} fill="url(#ger4k-grid)" />

        {/* Base network — significantly muted when a route is focused. */}
        <g opacity={hasFocus ? 0.16 : 0.9}>
          {baseLines.map((id) => {
            const info = lineInfoFor(id);
            const isBus = info?.kind !== "rail";
            return (
              <path
                key={id}
                d={toSmoothPath(linePoints(id))}
                fill="none"
                stroke={info?.colour ?? "#94A3B8"}
                strokeWidth={isBus ? 4 : 7}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={info?.kind === "replacement-bus" ? "14 10" : isBus ? "4 10" : undefined}
              />
            );
          })}
        </g>

        {/* Putrajaya Line distance break */}
        <g aria-hidden="true">
          <rect x={STATION_POS["chan-sow-lin"].x - 16} y={BREAK_Y[0]} width={32} height={BREAK_Y[1] - BREAK_Y[0]} fill="#EEF2F7" />
          <path
            d={`M${STATION_POS["chan-sow-lin"].x - 15},${BREAK_Y[0] + 8} l30,-12 M${STATION_POS["chan-sow-lin"].x - 15},${BREAK_Y[1]} l30,-12`}
            stroke="#94A3B8"
            strokeWidth={3.5}
          />
          <text x={STATION_POS["chan-sow-lin"].x + 26} y={(BREAK_Y[0] + BREAK_Y[1]) / 2 + 6} fontSize={18} fill="#64748B" fontWeight={600}>
            ≈ 25 km
          </text>
        </g>

        {/* Line badges near each rail segment (hidden while a route is focused). */}
        {!hasFocus
          ? RAIL_LINES.map((id) => {
              const info = lineInfo.find((l) => l.lineId === id);
              const at = pointAlongLine(id, BADGE_FRACTION[id] ?? 0.4);
              if (!info || !at) return null;
              const shortName = info.mode === "MRT" ? `MRT ${info.name.replace(/ Line$/, "")}` : info.mode === "LRT" ? `LRT ${info.name.replace(/ Line$/, "")}` : info.name;
              return <LineBadgeMark key={`badge-${id}`} at={at} code={info.code} name={shortName} colour={info.colour} textColour={info.textColour} />;
            })
          : null}

        {/* Other presented options (thin, between muted base and selected). */}
        {others.map((j) =>
          journeyStrokes(j).map((s, i) => (
            <path
              key={`${j.id}-${i}`}
              d={s.d}
              fill="none"
              stroke={s.colour}
              strokeWidth={5}
              strokeOpacity={0.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={s.kind === "walk" ? "2 10" : "11 9"}
            />
          )),
        )}

        {/* Ride-hail preview */}
        {rideHail ? (
          <g>
            {journeyStrokes(rideHail.railJourney).map((s, i) => (
              <path key={`rh-${i}`} d={s.d} fill="none" stroke={s.colour} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            <path
              d={toSmoothPath(straight(rideHail.hailStationId, rideHail.destinationId))}
              fill="none"
              stroke="#1F2937"
              strokeWidth={6}
              strokeDasharray="18 11"
              strokeLinecap="round"
            />
          </g>
        ) : null}

        {/* Selected route — strongest opacity, cased and thick. */}
        {selected ? (
          <g>
            {journeyStrokes(selected).map((s, i) =>
              s.kind === "walk" ? (
                <path key={`sel-${i}`} d={s.d} fill="none" stroke="#334155" strokeWidth={6} strokeDasharray="1 13" strokeLinecap="round" />
              ) : (
                <g key={`sel-${i}`}>
                  <path d={s.d} fill="none" stroke="#FFFFFF" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
                  <path d={s.d} fill="none" stroke={s.colour} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              ),
            )}
          </g>
        ) : null}

        {/* Disrupted segments — ONE clear treatment: broken red line + single ✕. */}
        {disruptions.map((d) => {
          const lineId = lineInfoFor(d.affectedSegment.line)?.lineId ?? d.affectedSegment.line;
          const pts = lineId ? legPoints(lineId, d.affectedSegment.from, d.affectedSegment.to) : [];
          if (pts.length < 2) return null;
          const m = midpoint(pts);
          return (
            <g key={d.id}>
              <path d={toSmoothPath(pts)} fill="none" stroke="#FFFFFF" strokeWidth={16} strokeLinecap="round" />
              <path d={toSmoothPath(pts)} fill="none" stroke="#EF4444" strokeWidth={7} strokeDasharray="10 9" strokeLinecap="round" />
              <circle cx={m.x} cy={m.y} r={15} fill="#EF4444" stroke="#fff" strokeWidth={3.5} />
              <path d={`M${m.x - 6},${m.y - 6} L${m.x + 6},${m.y + 6} M${m.x + 6},${m.y - 6} L${m.x - 6},${m.y + 6}`} stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
              <g transform={`translate(${m.x + 24}, ${m.y - 18})`}>
                <rect width={96} height={34} rx={17} fill="#FEE2E2" stroke="#EF4444" strokeWidth={1.5} />
                <text x={48} y={23} textAnchor="middle" fontSize={17} fontWeight={700} fill="#B91C1C">
                  Disrupted
                </text>
              </g>
            </g>
          );
        })}

        {/* Stations */}
        {demoStations.map((s) => {
          const at = STATION_POS[s.id];
          if (!at) return null;
          const onRoute = focusIds.has(s.id) || (rideHail && (rideHail.hailStationId === s.id || rideHail.destinationId === s.id));
          const interchange = s.lines.length > 1;
          const isEnd = s.id === origin || s.id === destination;
          const detail = pulse?.get(s.id);
          const showPulse = detail && detail.summary.reportCount > 0 && (!hasFocus || onRoute);
          const lab = LABELS[s.id] ?? { dx: 16, dy: 6, anchor: "start" as const };
          const condition = detail?.summary.reportCount ? detail.summary.condition : null;
          const name = `${s.name}${condition ? `, ${condition === "Severe disruption" ? "severe disruption" : condition.toLowerCase()} reported` : ""}${onRoute ? ", on your route" : ""}. Open station details`;
          const dim = hasFocus && !onRoute;
          // Label tiering: route/end stations strong; interchanges & anchors medium;
          // unrelated stations hidden while a route is focused to reduce clutter.
          const strong = onRoute || isEnd;
          const relevant = strong || ALWAYS_LABEL.has(s.id) || !!condition;
          const showLabel = !hasFocus ? relevant || !dim : relevant;
          return (
            <g
              key={s.id}
              role="button"
              tabIndex={0}
              aria-label={name}
              className="cursor-pointer outline-none [&:focus-visible>circle.ring]:opacity-100"
              onClick={() => onStationClick?.(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onStationClick?.(s.id);
                }
              }}
              opacity={dim ? 0.5 : 1}
            >
              <circle className="ring" cx={at.x} cy={at.y} r={26} fill="none" stroke="#4F46E5" strokeWidth={4} opacity={0} />
              <circle cx={at.x} cy={at.y} r={30} fill="transparent" />
              {isEnd ? (
                <>
                  <circle cx={at.x} cy={at.y} r={14} fill="#111827" />
                  <circle cx={at.x} cy={at.y} r={6} fill="#FFFFFF" />
                </>
              ) : (
                <circle
                  cx={at.x}
                  cy={at.y}
                  r={interchange ? 11 : 8}
                  fill="#FFFFFF"
                  stroke={onRoute ? "#111827" : "#475569"}
                  strokeWidth={interchange ? 4.5 : 3.5}
                />
              )}
              {showPulse && condition ? <PulseMarker at={at} condition={condition} /> : null}
              {showLabel ? (
                <text
                  x={at.x + lab.dx}
                  y={at.y + lab.dy}
                  textAnchor={lab.anchor}
                  fontSize={strong ? 21 : 15}
                  fontWeight={strong ? 700 : 600}
                  fill={dim ? "#94A3B8" : strong ? "#111827" : "#64748B"}
                  stroke="#EEF2F7"
                  strokeWidth={5}
                  paintOrder="stroke"
                >
                  {s.name}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* Legend — transport lines on the map (never implementation terms). */}
      <div className="pointer-events-none absolute bottom-[calc(42dvh-2.75rem)] left-2 right-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface/95 px-3 py-2 text-caption font-medium text-foreground-muted shadow-sm sm:right-auto lg:bottom-3">
        {legendLines.map((l) => (
          <span key={l.lineId} className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-4 min-w-7 items-center justify-center rounded px-1 text-[10px] font-extrabold" style={{ backgroundColor: l.colour, color: l.textColour }}>
              {l.code}
            </span>
            <span className="hidden sm:inline">{l.name}</span>
          </span>
        ))}
      </div>

      {/* Station Pulse key — visually separate from the transport-line legend. */}
      {pulse && pulse.size > 0 ? (
        <div className="pointer-events-none absolute left-2 top-16 flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl bg-surface/95 px-2.5 py-1.5 text-caption font-medium text-foreground-muted shadow-sm lg:bottom-14 lg:top-auto">
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-subtle">Pulse</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-success" aria-hidden="true" />Normal</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rotate-45 bg-warning" aria-hidden="true" />Busy</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-[2px] bg-critical" aria-hidden="true" />Packed</span>
        </div>
      ) : null}
    </div>
  );
}

export default TransitMap;
