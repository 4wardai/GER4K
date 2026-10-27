/**
 * Transit map layout (Requirement 17).
 *
 * City-core station positions are PROJECTED from official GTFS Static
 * coordinates (fixture `lat`/`lon`) with a simple equirectangular projection
 * (~75 px per km). Putrajaya Sentral (~25 km south) is placed below a labelled
 * break. Intermediate shape points (Pudu, Hang Tuah, Plaza Rakyat, Dang Wangi,
 * Kampung Baru, road points) also come from GTFS coordinates; they are drawn as
 * line geometry only, never as plannable stations.
 */

import { demoStations, LINE_IDS, MULTIMODAL_LINE_IDS, STATION_IDS } from "@/data";

// The viewBox is enlarged (≈2× the previous 380×440) so the same GTFS geometry
// carries proportionally SMALLER station labels once the SVG scales to fill the
// desktop map panel — the root cause of the previous "giant labels" problem.
export const VIEW = { w: 760, h: 880 } as const;

const LON0 = 101.69;
const LON_SPAN = 0.036;
const LAT0 = 3.166;
const LAT_SPAN = 0.042;

export interface Pt {
  x: number;
  y: number;
}

export function project(lat: number, lon: number): Pt {
  return {
    x: Math.round((60 + ((lon - LON0) / LON_SPAN) * 600) * 10) / 10,
    y: Math.round((60 + ((LAT0 - lat) / LAT_SPAN) * 680) * 10) / 10,
  };
}

/** Station positions (projected from GTFS); Putrajaya Sentral placed below a break. */
export const STATION_POS: Record<string, Pt> = (() => {
  const out: Record<string, Pt> = {};
  for (const s of demoStations) {
    if (s.lat !== undefined && s.lon !== undefined) out[s.id] = project(s.lat, s.lon);
  }
  const csl = out[STATION_IDS.chanSowLin];
  out[STATION_IDS.putrajayaSentral] = { x: csl.x, y: 824 };
  return out;
})();

/** The y range of the "≈ 25 km" break on the Putrajaya Line. */
export const BREAK_Y: [number, number] = [716, 768];

// Shape points from GTFS stop coordinates (not plannable stations).
const SHAPE: Record<string, Pt> = {
  pudu: project(3.134879, 101.711957),
  hangTuah: project(3.140012, 101.705984),
  plazaRakyat: project(3.144049, 101.702105),
  dangWangi: project(3.156942, 101.701975),
  kampungBaru: project(3.161386, 101.706608),
  // Bus 300 road points (GTFS stops: Capsquare, LRT Dang Wangi, Renaissance, KLCC (OPP)).
  bus1: project(3.1531, 101.6982),
  bus2: project(3.1572, 101.7013),
  bus3: project(3.1592, 101.7056),
  bus4: project(3.1583, 101.7115),
};

type PathPoint = string | Pt;

const offset = (p: Pt, dx: number, dy = 0): Pt => ({ x: p.x + dx, y: p.y + dy });

/** Ordered geometry for each line; strings are station ids. */
export const LINE_PATHS: Record<string, PathPoint[]> = {
  [LINE_IDS.putrajaya]: [
    STATION_IDS.putrajayaSentral,
    STATION_IDS.chanSowLin,
    STATION_IDS.trx,
    STATION_IDS.conlay,
    STATION_IDS.persiaranKlcc,
    STATION_IDS.ampangPark,
  ],
  [LINE_IDS.kajang]: [
    STATION_IDS.pasarSeni,
    STATION_IDS.merdeka,
    STATION_IDS.bukitBintang,
    STATION_IDS.trx,
  ],
  [LINE_IDS.kelanaJaya]: [
    STATION_IDS.pasarSeni,
    STATION_IDS.masjidJamek,
    SHAPE.dangWangi,
    SHAPE.kampungBaru,
    STATION_IDS.klcc,
    STATION_IDS.ampangPark,
  ],
  [LINE_IDS.ampangSriPetaling]: [
    STATION_IDS.chanSowLin,
    SHAPE.pudu,
    SHAPE.hangTuah,
    SHAPE.plazaRakyat,
    STATION_IDS.masjidJamek,
  ],
  [MULTIMODAL_LINE_IDS.bus300]: [
    STATION_IDS.masjidJamek,
    SHAPE.bus1,
    SHAPE.bus2,
    SHAPE.bus3,
    SHAPE.bus4,
    STATION_IDS.klcc,
  ],
  // Drawn alongside (offset from) the Putrajaya Line so both stay visible.
  [MULTIMODAL_LINE_IDS.replacementBus]: [
    STATION_IDS.trx,
    offset(project(3.1475, 101.7195), 20),
    STATION_IDS.conlay,
    STATION_IDS.persiaranKlcc,
  ],
};

/** Per-line pixel offset for station-anchored points (keeps parallel services apart). */
const LINE_OFFSET: Record<string, number> = {
  [MULTIMODAL_LINE_IDS.replacementBus]: 20,
};

function resolve(p: PathPoint, lineId: string): Pt | null {
  if (typeof p !== "string") return p;
  const base = STATION_POS[p];
  if (!base) return null;
  const dx = LINE_OFFSET[lineId] ?? 0;
  return dx ? offset(base, dx) : base;
}

/** Full geometry for a line. */
export function linePoints(lineId: string): Pt[] {
  return (LINE_PATHS[lineId] ?? [])
    .map((p) => resolve(p, lineId))
    .filter((p): p is Pt => p !== null);
}

/** Geometry for a ride between two stations on a line (either direction). */
export function legPoints(lineId: string, from: string, to: string): Pt[] {
  const path = LINE_PATHS[lineId];
  if (!path) return straight(from, to);
  const i = path.indexOf(from);
  const j = path.indexOf(to);
  if (i === -1 || j === -1) return straight(from, to);
  const slice = i <= j ? path.slice(i, j + 1) : path.slice(j, i + 1).reverse();
  return slice.map((p) => resolve(p, lineId)).filter((p): p is Pt => p !== null);
}

export function straight(from: string, to: string): Pt[] {
  const a = STATION_POS[from];
  const b = STATION_POS[to];
  return a && b ? [a, b] : [];
}

export function toPath(points: Pt[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
}

/**
 * A smooth path through the points using Catmull-Rom → cubic Bézier, so route
 * lines read as gentle curves rather than hard polylines. `tension` 0..1 keeps
 * the curve close to the points (lower = straighter). Falls back to a straight
 * segment for 2 points.
 */
export function toSmoothPath(points: Pt[], tension = 0.5): string {
  if (points.length < 2) return "";
  if (points.length === 2) return toPath(points);
  const t = (1 - tension) / 6;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x},${p2.y}`;
  }
  return d;
}

/** A point along a line's geometry for placing a line badge (default ~40%). */
export function pointAlongLine(lineId: string, fraction = 0.4): Pt | null {
  const pts = linePoints(lineId);
  if (pts.length === 0) return null;
  if (pts.length === 1) return pts[0];
  const idx = Math.min(pts.length - 2, Math.max(0, Math.floor((pts.length - 1) * fraction)));
  const a = pts[idx];
  const b = pts[idx + 1];
  const f = (pts.length - 1) * fraction - idx;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

export function midpoint(points: Pt[]): Pt {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  const a = points[0];
  const b = points[points.length - 1];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Label placement per station (offsets in the enlarged 760×880 viewBox). */
export const LABELS: Record<string, { dx: number; dy: number; anchor: "start" | "end" | "middle" }> = {
  [STATION_IDS.klcc]: { dx: -10, dy: -14, anchor: "end" },
  [STATION_IDS.ampangPark]: { dx: 18, dy: -8, anchor: "start" },
  [STATION_IDS.persiaranKlcc]: { dx: 20, dy: 5, anchor: "start" },
  [STATION_IDS.conlay]: { dx: 20, dy: 5, anchor: "start" },
  [STATION_IDS.trx]: { dx: 18, dy: 20, anchor: "start" },
  [STATION_IDS.chanSowLin]: { dx: 18, dy: 6, anchor: "start" },
  [STATION_IDS.bukitBintang]: { dx: 0, dy: -14, anchor: "middle" },
  [STATION_IDS.merdeka]: { dx: 0, dy: 26, anchor: "middle" },
  [STATION_IDS.pasarSeni]: { dx: -16, dy: 22, anchor: "end" },
  [STATION_IDS.masjidJamek]: { dx: -16, dy: 5, anchor: "end" },
  [STATION_IDS.putrajayaSentral]: { dx: 18, dy: 6, anchor: "start" },
};
