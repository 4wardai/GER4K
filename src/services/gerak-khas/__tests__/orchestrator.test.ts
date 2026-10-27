import { describe, it, expect, beforeAll } from "vitest";

import {
  demoStations,
  historicalDemandDataset,
  mockDataProvider,
  DEMO_ORIGIN_ID,
  DEMO_DESTINATION_ID,
  STATION_IDS,
} from "@/data";
import { buildJourneyOptions, pulseDetailsFor } from "@/domain/options";
import { buildStationContexts } from "@/services/ai/buildCopilotRequest";
import { stationName } from "@/components/state/useLiveData";
import { routeQuestion } from "../intentRouter";
import { orchestrate } from "../orchestrator";
import { createActionHandler, isRouteValid } from "../actions";
import type { CurrentJourneyContext, GerakKhasAction } from "../types";

function buildContext(): CurrentJourneyContext {
  const now = Date.now();
  const core = mockDataProvider.getNetwork();
  const disruptions = mockDataProvider.getDisruptions();
  const pulse = pulseDetailsFor(
    demoStations.map((s) => s.id),
    (id) => [...mockDataProvider.getReports(id), ...mockDataProvider.getScenarioReports(id)],
    now,
  );
  const result = buildJourneyOptions({
    network: mockDataProvider.getMultimodalNetwork({ includeScenarioServices: true }),
    coreNetwork: core,
    originId: DEMO_ORIGIN_ID,
    destinationId: DEMO_DESTINATION_ID,
    disruptions,
    isRecovery: true,
    pulseByStation: pulse,
    fareRules: mockDataProvider.getFareRules(),
    profile: "Balanced",
    stationName,
  });
  const stations = buildStationContexts(
    demoStations.map((s) => s.id),
    demoStations,
    pulse,
    historicalDemandDataset,
    now,
  );
  const pulseObj: CurrentJourneyContext["pulse"] = {};
  pulse.forEach((d, id) => (pulseObj[id] = d));
  return {
    originId: DEMO_ORIGIN_ID,
    destinationId: DEMO_DESTINATION_ID,
    originName: stationName(DEMO_ORIGIN_ID),
    destinationName: stationName(DEMO_DESTINATION_ID),
    usualRouteId: null,
    selectedRouteId: result.options[0]?.id ?? null,
    options: result.options,
    candidates: result.candidates,
    profile: "Balanced",
    mobilityNeeds: [],
    recovery: true,
    disruption: { summary: "TRX -> Conlay", severity: "severe" },
    pulse: pulseObj,
    stations,
    now,
  };
}

let ctx: CurrentJourneyContext;
beforeAll(() => {
  ctx = buildContext();
});

describe("intent router", () => {
  it("classifies representative questions deterministically", () => {
    const stations = ctx.stations;
    expect(routeQuestion("Why this route?", stations).primary).toBe("recommendation");
    expect(routeQuestion("Which route is cheapest?", stations).primary).toBe("recommendation");
    expect(routeQuestion("Is there a bus option?", stations).primary).toBe("bus");
    expect(routeQuestion("What's the fare?", stations).primary).toBe("fare");
    expect(routeQuestion("How far do I walk?", stations).primary).toBe("walking");
    expect(routeQuestion("What is the service status?", stations).primary).toBe("service");
    expect(routeQuestion("Is this information live?", stations).primary).toBe("liveness");
  });

  it("is deterministic (same text+context -> same routing)", () => {
    const a = routeQuestion("What's cheapest but avoids TRX?", ctx.stations);
    const b = routeQuestion("What's cheapest but avoids TRX?", ctx.stations);
    expect(a).toEqual(b);
  });

  it("extracts compound constraints: cheapest + avoid TRX", () => {
    const r = routeQuestion("What's cheapest but avoids TRX?", ctx.stations);
    expect(r.preference).toBe("Cheapest");
    expect(r.constraints.excludeStationIds).toContain(STATION_IDS.trx);
    expect(r.tools).toContain("ranking");
  });

  it("routes grandmother to accessibility with Accessible preference", () => {
    const r = routeQuestion("I'm travelling with my grandmother.", ctx.stations);
    expect(r.primary).toBe("accessibility");
    expect(r.preference).toBe("Accessible");
    expect(r.tools).toContain("walking");
  });

  it("requires a bus + less walking (multi-tool)", () => {
    const r = routeQuestion("Is there a bus with less walking?", ctx.stations);
    expect(r.constraints.requireBus).toBe(true);
    expect(r.preference).toBe("Least Walking");
  });
});

describe("orchestrator (deterministic fallback, no AI)", () => {
  it("answers Why this route with a SELECT_ROUTE action", () => {
    const res = orchestrate({ question: "Why this route?", ctx });
    expect(res.source?.ai).toBe(false);
    expect(res.actions?.some((a) => a.type === "SELECT_ROUTE")).toBe(true);
  });

  it("answers cheapest + avoid TRX without any option touching TRX", () => {
    const res = orchestrate({ question: "What's cheapest but avoids TRX?", ctx, disruptions: mockDataProvider.getDisruptions() });
    const rec = res.routeRecommendation;
    if (rec) {
      const opt = [...ctx.options, ...ctx.candidates].find((o) => o.id === rec.routeId);
      expect(opt?.touchStationIds.includes(STATION_IDS.trx)).toBe(false);
    }
    expect(res.actions?.some((a) => a.type === "SELECT_ROUTE")).toBe(true);
  });

  it("answers the bus question with a bus-supported option", () => {
    const res = orchestrate({ question: "Is there a bus option?", ctx });
    expect(res.evidence?.some((e) => e.tool === "bus")).toBe(true);
    expect(res.actions?.some((a) => a.type === "SHOW_BUS")).toBe(true);
  });

  it("answers the fare question with an ESTIMATED label", () => {
    const res = orchestrate({ question: "What's the fare?", ctx });
    expect(res.evidence?.some((e) => e.tool === "fare" && e.sourceStatus === "ESTIMATED")).toBe(true);
  });

  it("gives honest uncertainty for an unsupported fact", () => {
    const res = orchestrate({ question: "What colour are the station seats?", ctx });
    expect((res.warnings ?? []).length).toBeGreaterThan(0);
  });

  it("tells the user to plan a journey first when no context", () => {
    const res = orchestrate({ question: "Which route has less walking?", ctx: null });
    expect(res.answer.toLowerCase()).toContain("plan a journey");
  });

  it("is deterministic (same input -> same response)", () => {
    const a = orchestrate({ question: "What's the fare?", ctx });
    const b = orchestrate({ question: "What's the fare?", ctx });
    expect(a).toEqual(b);
  });

  it("only ever emits SELECT_ROUTE for a currently valid route id", () => {
    const res = orchestrate({ question: "Anything with less walking?", ctx });
    for (const a of res.actions ?? []) {
      if (a.type === "SELECT_ROUTE" || a.type === "SHOW_BUS") {
        expect(isRouteValid(ctx, a.routeId)).toBe(true);
      }
    }
  });
});

describe("action handler", () => {
  it("rejects a stale SELECT_ROUTE and notifies instead of selecting", () => {
    let selected: string | null = null;
    let notified = "";
    const handler = createActionHandler({
      context: ctx,
      requestRouteSelection: (id) => (selected = id),
      setPreferredProfile: () => {},
      openStation: () => {},
      navigate: () => {},
      showVisual: () => {},
      notify: (t) => (notified = t),
    });
    const stale: GerakKhasAction = { type: "SELECT_ROUTE", label: "Use", routeId: "no-such-route" };
    handler(stale);
    expect(selected).toBeNull();
    expect(notified.toLowerCase()).toContain("no longer available");
  });

  it("selects a valid route", () => {
    let selected: string | null = null;
    const handler = createActionHandler({
      context: ctx,
      requestRouteSelection: (id) => (selected = id),
      setPreferredProfile: () => {},
      openStation: () => {},
      navigate: () => {},
      showVisual: () => {},
      notify: () => {},
    });
    const valid = ctx.options[0];
    handler({ type: "SELECT_ROUTE", label: "Use", routeId: valid.id });
    expect(selected).toBe(valid.id);
  });

  it("SET_PREFERENCE updates the ranking preference", () => {
    let pref = "";
    const handler = createActionHandler({
      context: ctx,
      requestRouteSelection: () => {},
      setPreferredProfile: (p) => (pref = p),
      openStation: () => {},
      navigate: () => {},
      showVisual: () => {},
      notify: () => {},
    });
    handler({ type: "SET_PREFERENCE", label: "Prioritise Cheapest", preference: "Cheapest" });
    expect(pref).toBe("Cheapest");
  });
});
