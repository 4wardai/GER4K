/**
 * Presentation helpers for transit lines and legs: official line colours,
 * passenger labels and direction text. Pure; no React.
 */

import { lineInfo } from "@/data";
import type { JourneyLeg, LineInfo } from "@/types";

export type LegIcon = "train" | "bus" | "walk" | "car";

export interface LegVisual {
  colour: string;
  textColour: string;
  /** e.g. "MRT Putrajaya", "LRT Kelana Jaya", "Bus 300", "Replacement bus", "Walk". */
  label: string;
  /** Compact chip text, e.g. "PYL", "KJL", "300". */
  short: string;
  icon: LegIcon;
  info?: LineInfo;
}

const WALK: LegVisual = { colour: "#94A3B8", textColour: "#1F2937", label: "Walk", short: "Walk", icon: "walk" };
const CAR: LegVisual = { colour: "#1F2937", textColour: "#FFFFFF", label: "Ride-hailing", short: "Car", icon: "car" };

export function lineInfoFor(ref: string | undefined): LineInfo | undefined {
  if (!ref) return undefined;
  return lineInfo.find((l) => l.lineId === ref) ?? lineInfo.find((l) => l.name === ref);
}

export function legVisual(leg: Pick<JourneyLeg, "legKind" | "lineId" | "line" | "mode">): LegVisual {
  if (leg.legKind === "walk") return WALK;
  if (leg.legKind === "ride-hail") return CAR;
  const info = lineInfoFor(leg.lineId) ?? lineInfoFor(leg.line);
  if (!info) {
    return { colour: "#0284C7", textColour: "#FFFFFF", label: leg.line ?? leg.mode, short: leg.mode, icon: "train" };
  }
  if (info.kind === "bus") {
    return { colour: info.colour, textColour: info.textColour, label: `Bus ${info.code}`, short: info.code, icon: "bus", info };
  }
  if (info.kind === "replacement-bus") {
    return { colour: info.colour, textColour: info.textColour, label: "Replacement bus", short: "Bus", icon: "bus", info };
  }
  return {
    colour: info.colour,
    textColour: info.textColour,
    label: `${info.mode} ${info.name.replace(/ Line$/, "")}`,
    short: info.code,
    icon: "train",
    info,
  };
}

/** "towards Kwasa Damansara" for a ride from `from` to `to` on the line. */
export function directionText(info: LineInfo | undefined, from: string, to: string): string | null {
  if (!info) return null;
  const i = info.realOrder.indexOf(from);
  const j = info.realOrder.indexOf(to);
  if (i === -1 || j === -1 || i === j) return null;
  return `towards ${j < i ? info.termini[0] : info.termini[1]}`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatRm(sen: number): string {
  return `RM${(sen / 100).toFixed(2)}`;
}

export function formatWalk(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

export function changesText(n: number): string {
  return n === 0 ? "No changes" : `${n} change${n === 1 ? "" : "s"}`;
}

/** Clock time "08:43" from a base epoch + minutes. */
export function clockAt(baseMs: number, plusMin: number): string {
  const d = new Date(baseMs + plusMin * 60_000);
  return d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: false });
}
