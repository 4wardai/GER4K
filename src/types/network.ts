/**
 * Transport network model.
 *
 * These types describe the static shape of the fixture network that the
 * Journey_Planner and Recovery_Engine read via the DataProvider's
 * `getNetwork()`. They are framework-free (no React/Next imports) and carry no
 * runtime labelling themselves — individual journey legs built from the network
 * carry the {@link Labelled} axes.
 */

/** A station in the transport network. */
export interface Station {
  id: string;
  name: string;
  /** Line ids/names this station sits on (e.g. Putrajaya Line, Kelana Jaya Line). */
  lines: string[];
  /** Full Vision: official station codes from GTFS Static (e.g. "PY23", "KG20"). */
  codes?: string[];
  /** Full Vision: latitude from official GTFS Static stops. */
  lat?: number;
  /** Full Vision: longitude from official GTFS Static stops. */
  lon?: number;
  /** Full Vision: official GTFS `isOKU` (disabled-friendly facilities) flag. */
  isOKU?: boolean;
}

/** Kind of service a line represents (Full Vision). Defaults to rail. */
export type LineKind = "rail" | "bus" | "replacement-bus";

/**
 * A walking connection between two different stations (Full Vision), used for
 * access/egress walking such as Persiaran KLCC ↔ KLCC. Walking is symmetric.
 */
export interface WalkLink {
  from: string;
  to: string;
  walkMeters: number;
  walkTimeMin: number;
}

/**
 * A transport line (rail line, LRT, monorail, bus route, etc.) and its mode.
 *
 * `mode` uses Klang Valley transit terminology such as MRT / LRT / Monorail /
 * KTM / Rapid KL Bus / MRT Feeder.
 */
export interface NetworkLine {
  /** Stable line id, e.g. "putrajaya-line". */
  id: string;
  /** Display name, e.g. "Putrajaya Line". */
  name: string;
  /** Transport mode for this line. */
  mode: string;
  /**
   * Ordered station ids along the line. Order lets the Recovery_Engine reason
   * about which segment a leg traverses (e.g. whether it crosses TRX–Conlay).
   */
  stationIds: string[];
  /** Full Vision: rail (default), bus, or scenario replacement bus. */
  kind?: LineKind;
  /** Full Vision: short service name, e.g. "300" for Rapid KL bus 300. */
  shortName?: string;
  /** Full Vision: typical headway in minutes (official GTFS frequencies where available). */
  headwayMin?: number;
  /** Full Vision: true when the service only exists in the simulated scenario. */
  isSimulated?: boolean;
}

/**
 * A directed segment between two adjacent stations on a given line.
 *
 * Segments are the edges the planner and recovery engine traverse to build
 * legs. The Recovery_Engine uses `{ from, to, lineId }` to decide whether a
 * segment is the blocked one (e.g. the TRX–Conlay Putrajaya Line segment) and
 * therefore must be avoided.
 */
export interface NetworkSegment {
  /** Origin station id. */
  from: string;
  /** Destination station id. */
  to: string;
  /** Line this segment belongs to (see {@link NetworkLine.id}). */
  lineId: string;
  /** Transport mode for the segment (mirrors the owning line's mode). */
  mode: string;
  /** Scheduled/estimated travel time for the segment, in minutes. */
  travelTimeMin: number;
  /** Walking distance associated with the segment, in metres (usually 0 for in-vehicle hops). */
  walkMeters: number;
  /** Full Vision: demo fare estimate for this hop, in sen (RM0.01). */
  fareSen?: number;
}

/**
 * An interchange where a passenger can transfer between two lines at a station.
 *
 * `walkMeters` captures the walking cost of the transfer, which feeds the
 * journey's `totalWalkMeters` and the Least Walking preference.
 */
export interface NetworkInterchange {
  /** Station id where the transfer happens (e.g. Ampang Park, Pasar Seni). */
  stationId: string;
  /** Line id being transferred from. */
  fromLineId: string;
  /** Line id being transferred to. */
  toLineId: string;
  /** Walking distance for the transfer, in metres. */
  walkMeters: number;
  /** Estimated time cost of the transfer walk/wait, in minutes. */
  transferTimeMin: number;
}

/**
 * The full framework-free transport network returned by the DataProvider.
 *
 * Intentionally minimal: it carries the set of stations, the lines, the
 * directed segments between adjacent stations, and the interchange relationships
 * between lines. This is enough for the Journey_Planner to assemble legs and for
 * the Recovery_Engine to find alternatives and verify that a leg does not
 * traverse a blocked segment (e.g. TRX–Conlay on the Putrajaya Line).
 */
export interface TransportNetwork {
  /** All stations in the fixture network. */
  stations: Station[];
  /** All lines in the fixture network. */
  lines: NetworkLine[];
  /** Directed segments between adjacent stations. */
  segments: NetworkSegment[];
  /** Transfer relationships between lines at interchange stations. */
  interchanges: NetworkInterchange[];
  /** Full Vision: walking connections between nearby stations (access/egress). */
  walkLinks?: WalkLink[];
}
