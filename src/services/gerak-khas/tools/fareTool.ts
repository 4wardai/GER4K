/**
 * FareTool — reads the EXISTING fare estimate already computed on each option
 * (`JourneyOption.fare`, produced by the Fare_Engine). It never invents fares;
 * fares are always ESTIMATED and not simulated.
 */
import type { JourneyOption } from "@/types";
import type { MobilityToolResult } from "../types";
import { evidence, rm } from "./helpers";

export interface FareToolData {
  totalSen: number;
  formatted: string;
  items: { label: string; amount: string }[];
}

export function fareTool(option: JourneyOption | null): MobilityToolResult<FareToolData> {
  if (!option) return { ok: false, reason: "cannot estimate fare — no route selected" };
  const fare = option.fare;
  if (!fare) return { ok: false, reason: "cannot estimate fare — missing fare data" };
  const items = fare.items.map((i) => ({ label: i.label, amount: rm(i.amountSen) }));
  return {
    ok: true,
    data: { totalSen: fare.totalSen, formatted: rm(fare.totalSen), items },
    // Fare_Engine always labels ESTIMATED / not simulated.
    evidence: [evidence("fare", "Fare (demo estimate)", rm(fare.totalSen), "ESTIMATED", false, { routeId: option.id })],
  };
}
