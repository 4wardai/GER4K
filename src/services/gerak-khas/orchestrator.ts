/**
 * Gerak Khas orchestrator (Requirements 11, 12, 16) — PURE, DETERMINISTIC,
 * BOUNDED. For one question it:
 *   1. routes to one primary intent + a fixed tool set + a ConstraintSet,
 *   2. filters candidates on the constraints (never the LLM),
 *   3. orders the surviving subset with the Ranking_Engine ONLY,
 *   4. gathers evidence from the fixed tool set,
 *   5. assembles a GerakKhasResponse with structured actions.
 * No AI is involved here (the optional Bedrock rephrase is a separate layer).
 * Same question + same context -> same response.
 */
import { stationName } from "@/components/state/useLiveData";
import type { Disruption, JourneyOption, PreferenceProfile } from "@/types";
import type {
  CurrentJourneyContext,
  EvidenceItem,
  GerakKhasAction,
  GerakKhasResponse,
} from "./types";
import { routeQuestion } from "./intentRouter";
import { buildResponse } from "./responseBuilder";
import {
  accessibilityTool,
  applyConstraints,
  busTool,
  fareTool,
  historicalDemandTool,
  journeyTool,
  pulseTool,
  rankingTool,
  recoveryTool,
  serviceStatusTool,
  stationTool,
  walkingTool,
} from "./tools";

export interface OrchestrateInput {
  question: string;
  ctx: CurrentJourneyContext | null;
  /** Active disruptions (for service status). Defaults to none. */
  disruptions?: Disruption[];
}

const NO_JOURNEY =
  "Plan a journey first and I'll compare your options — routes, fares, walking and crowding.";

function selectedOption(ctx: CurrentJourneyContext | null): JourneyOption | null {
  if (!ctx) return null;
  return ctx.options.find((o) => o.id === ctx.selectedRouteId) ?? ctx.options[0] ?? null;
}

export function orchestrate(input: OrchestrateInput): GerakKhasResponse {
  const { question, ctx } = input;
  const stations = ctx?.stations ?? [];
  const routed = routeQuestion(question, stations);
  const evidence: EvidenceItem[] = [];
  const actions: GerakKhasAction[] = [];
  const warnings: string[] = [];
  let answer = "";
  let routeRecommendation: { routeId: string; title: string } | undefined;
  let suggestedPreference: PreferenceProfile | null = null;

  const needsJourney =
    routed.primary === "journey" ||
    routed.primary === "recovery" ||
    routed.primary === "recommendation" ||
    routed.primary === "bus" ||
    routed.primary === "fare" ||
    routed.primary === "walking" ||
    routed.primary === "liveness";

  if (needsJourney && (!ctx || ctx.options.length === 0)) {
    return buildResponse({
      answer: NO_JOURNEY,
      evidence: [],
      actions: [],
      warnings: ["No journey is currently in context."],
      ctx,
    });
  }

  // Candidate pool + deterministic constraint filter + Ranking_Engine order.
  let ranked: JourneyOption[] = ctx?.options ?? [];
  if (ctx) {
    const pool = [...ctx.options, ...ctx.candidates];
    const filtered = applyConstraints(pool, routed.constraints);
    const subset = filtered.empty ? ctx.options : filtered.subset;
    const profile = routed.preference ?? ctx.profile;
    const r = rankingTool(subset, profile);
    if (r.ok) ranked = r.data.ordered;
    if (routed.preference && routed.preference !== ctx.profile) {
      suggestedPreference = routed.preference;
    }
    if (filtered.empty && routed.constraints.excludeStationIds.length > 0) {
      warnings.push("No option avoids that station right now — showing the best available.");
    }
  }
  const top = ranked[0] ?? selectedOption(ctx);

  switch (routed.primary) {
    case "journey": {
      const r = journeyTool(ctx);
      if (r.ok && r.data.selected) {
        evidence.push(...r.evidence);
        answer = `Your route ${r.data.selected.title} takes ${Math.round(r.data.selected.journey.totalTimeMin)} min.`;
      } else answer = NO_JOURNEY;
      break;
    }
    case "recovery": {
      const r = recoveryToolRun(ctx, evidence);
      answer = r;
      if (top) {
        routeRecommendation = { routeId: top.id, title: top.title };
        actions.push({ type: "SELECT_ROUTE", label: `Use ${top.title}`, routeId: top.id });
      }
      break;
    }
    case "recommendation": {
      if (top) {
        evidence.push(...toolEvidenceFor(top));
        const lead = suggestedPreference
          ? `For ${suggestedPreference.toLowerCase()}, I'd take ${top.title}.`
          : `I'd take ${top.title}.`;
        answer = lead;
        routeRecommendation = { routeId: top.id, title: top.title };
        actions.push({ type: "SELECT_ROUTE", label: `Use ${top.title}`, routeId: top.id, profile: suggestedPreference ?? undefined });
        if (suggestedPreference) {
          actions.push({ type: "SET_PREFERENCE", label: `Prioritise ${suggestedPreference}`, preference: suggestedPreference });
        }
      } else answer = NO_JOURNEY;
      break;
    }
    case "fare": {
      const r = fareTool(top);
      if (r.ok) {
        evidence.push(...r.evidence);
        answer = `${top!.title} is about ${r.data.formatted} (demo estimate).`;
        routeRecommendation = { routeId: top!.id, title: top!.title };
        actions.push({ type: "SELECT_ROUTE", label: `Use ${top!.title}`, routeId: top!.id });
      } else {
        answer = "I can't estimate the fare without a planned journey.";
        warnings.push(r.reason);
      }
      break;
    }
    case "walking": {
      const r = walkingTool(top);
      if (r.ok) {
        evidence.push(...r.evidence);
        const sel = selectedOption(ctx);
        const improved = sel && top && top.id !== sel.id && top.journey.totalWalkMeters < sel.journey.totalWalkMeters;
        answer = improved
          ? `${top!.title} cuts walking to about ${Math.round(top!.journey.totalWalkMeters)} m.`
          : `${top!.title} has about ${r.data.formatted} of walking.`;
        if (top) {
          routeRecommendation = { routeId: top.id, title: top.title };
          actions.push({ type: "SELECT_ROUTE", label: `Use ${top.title}`, routeId: top.id });
        }
      } else answer = NO_JOURNEY;
      break;
    }
    case "bus": {
      const r = busTool(ctx);
      if (r.ok) {
        evidence.push(...r.evidence);
        const w = walkingTool(r.data.option);
        if (w.ok) evidence.push(...w.evidence);
        const f = fareTool(r.data.option);
        if (f.ok) evidence.push(...f.evidence);
        answer = `Yes — ${r.data.option.title}${r.data.option.isSimulated ? " (simulated demo service)" : ""}.`;
        routeRecommendation = { routeId: r.data.option.id, title: r.data.option.title };
        actions.push({ type: "SHOW_BUS", label: `Show ${r.data.option.title}`, routeId: r.data.option.id });
        actions.push({ type: "SELECT_ROUTE", label: "Use this bus route", routeId: r.data.option.id });
      } else {
        answer = "There's no bus-supported option on this journey right now.";
        warnings.push(r.reason);
      }
      break;
    }
    case "crowding": {
      const sid = routed.stationId;
      const r = pulseTool(sid, stations);
      if (r.ok) {
        evidence.push(...r.evidence);
        answer = `${r.data.name} is reported ${r.data.condition} right now (${r.data.reportCount} recent report${r.data.reportCount === 1 ? "" : "s"}).`;
        actions.push({ type: "OPEN_PULSE", label: `Open ${r.data.name} in Pulse`, stationId: sid! });
        if (routed.constraints.excludeStationIds.length > 0 && top) {
          routeRecommendation = { routeId: top.id, title: top.title };
          actions.push({ type: "SELECT_ROUTE", label: `Avoid ${r.data.name}`, routeId: top.id });
        }
      } else if (sid) {
        answer = `I don't have recent crowd reports for ${stationName(sid)}.`;
        warnings.push(r.reason);
        actions.push({ type: "OPEN_PULSE", label: "Open Pulse", stationId: sid });
      } else {
        answer = "Which station would you like the crowd level for?";
      }
      break;
    }
    case "station": {
      const sid = routed.stationId ?? ctx?.selectedStation ?? null;
      const r = stationTool(sid, stations);
      if (r.ok) {
        evidence.push(...r.evidence);
        answer = `${r.data.name} is on ${r.data.lines.join(", ") || "the network"}.`;
        actions.push({ type: "OPEN_STATION", label: `Open ${r.data.name}`, stationId: sid! });
      } else {
        answer = sid ? `I don't recognise that station.` : "Which station do you mean?";
        if (r.ok === false) warnings.push(r.reason);
      }
      break;
    }
    case "service": {
      const r = serviceStatusTool(input.disruptions ?? [], ctx?.pulse ?? {}, stationName, routed.stationId ?? undefined);
      if (r.ok) {
        evidence.push(...r.evidence);
        const disrupted = r.data.statuses.filter((s) => s.status === "Disrupted");
        answer = disrupted.length
          ? `${disrupted.length} line${disrupted.length === 1 ? "" : "s"} disrupted right now.`
          : "All lines are running to schedule.";
        actions.push({ type: "SHOW_SERVICE", label: "Open Service status" });
      } else {
        answer = "I don't have service status for that line.";
        warnings.push(r.reason);
      }
      break;
    }
    case "accessibility": {
      const sid = routed.stationId ?? ctx?.selectedStation ?? null;
      const r = accessibilityTool(sid, ctx?.mobilityNeeds ?? [], stations);
      if (r.ok) {
        evidence.push(...r.evidence);
        if (ctx && top) {
          const w = walkingTool(top);
          if (w.ok) evidence.push(...w.evidence);
          answer = `I'd prioritise easier transfers and less walking — ${top.title} looks easiest. ${r.data.uncertainty}`;
          routeRecommendation = { routeId: top.id, title: top.title };
          actions.push({ type: "SELECT_ROUTE", label: `Use ${top.title}`, routeId: top.id, profile: "Accessible" });
          actions.push({ type: "SET_PREFERENCE", label: "Prioritise Accessible", preference: "Accessible" });
          suggestedPreference = "Accessible";
        } else {
          answer = `I'd prioritise the Accessible option. ${r.data.uncertainty}`;
        }
        warnings.push("No verified live lift/escalator data — please check signage.");
      }
      break;
    }
    case "historicalDemand": {
      const r = historicalDemandTool(routed.stationId);
      if (r.ok) {
        evidence.push(...r.evidence);
        answer = r.data.description;
      } else {
        answer = "I don't have historical demand data for that station.";
        warnings.push(r.reason);
      }
      break;
    }
    case "liveness": {
      answer =
        "Some data is live-style but simulated for the demo: rail times are scheduled estimates, " +
        "bus arrivals are simulated, and station conditions are community reports. Each value is labelled with its source.";
      if (top) evidence.push(...toolEvidenceFor(top));
      break;
    }
    case "visual": {
      const sid = routed.stationId ?? ctx?.selectedStation ?? null;
      if (sid) {
        answer = `I can show ${stationName(sid)}.`;
        actions.push({ type: "SHOW_VISUAL", label: `Show ${stationName(sid)}`, stationId: sid, mode: "REAL_REFERENCE" });
      } else {
        answer = "Which station would you like to see?";
      }
      break;
    }
    default: {
      answer = "I don't have reliable information for that yet. I can help with routes, fares, walking, crowding, buses and service status.";
      warnings.push("Unsupported question.");
    }
  }

  return buildResponse({
    answer,
    evidence,
    actions,
    warnings,
    ctx,
    routeRecommendation,
    suggestedPreference,
  });
}

/** Build the standard time/walk/fare evidence block for an option. */
function toolEvidenceFor(option: JourneyOption): EvidenceItem[] {
  const ev: EvidenceItem[] = [];
  const w = walkingTool(option);
  const f = fareTool(option);
  const j = journeyTool({
    options: [option],
    selectedRouteId: option.id,
  } as unknown as CurrentJourneyContext);
  if (j.ok) ev.push(...j.evidence.slice(0, 2));
  if (w.ok) ev.push(...w.evidence);
  if (f.ok) ev.push(...f.evidence);
  return ev;
}

function recoveryToolRun(ctx: CurrentJourneyContext | null, evidence: EvidenceItem[]): string {
  const r = recoveryTool(ctx);
  if (r.ok && r.data.recovery) {
    evidence.push(...r.evidence);
    return "Here are your recovery options that avoid the disruption.";
  }
  if (r.ok) return "Your journey isn't affected by any disruption right now.";
  return "I couldn't find a recovery alternative for that journey.";
}


