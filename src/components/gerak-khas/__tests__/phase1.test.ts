import { describe, it, expect } from "vitest";

import { resolveRobotState, statusLightTone } from "../robotState";
import { visibleQuickPrompts, QUICK_PROMPTS } from "../quickPrompts";

describe("resolveRobotState", () => {
  it("shows IDLE when resting with no disruption", () => {
    expect(resolveRobotState({ activity: "idle", severity: "none" })).toBe("IDLE");
  });

  it("prioritises active conversation beats over disruption", () => {
    expect(resolveRobotState({ activity: "listening", severity: "severe" })).toBe("LISTENING");
    expect(resolveRobotState({ activity: "thinking", severity: "moderate" })).toBe("THINKING");
    expect(resolveRobotState({ activity: "success", severity: "severe" })).toBe("SUCCESS");
  });

  it("maps disruption severity to DISRUPTION/SEVERE with SEVERE precedence", () => {
    expect(resolveRobotState({ activity: "idle", severity: "moderate" })).toBe("DISRUPTION");
    expect(resolveRobotState({ activity: "idle", severity: "severe" })).toBe("SEVERE");
  });

  it("is deterministic for the same input", () => {
    const input = { activity: "idle", severity: "moderate" } as const;
    expect(resolveRobotState(input)).toBe(resolveRobotState(input));
  });

  it("exposes amber for DISRUPTION and red for SEVERE", () => {
    expect(statusLightTone("DISRUPTION")).toBe("amber");
    expect(statusLightTone("SEVERE")).toBe("red");
    expect(statusLightTone("IDLE")).toBe("normal");
  });
});

describe("visibleQuickPrompts", () => {
  it("hides route-dependent prompts when no route is in context", () => {
    const shown = visibleQuickPrompts(false);
    expect(shown.map((p) => p.label)).toEqual(["Station info"]);
  });

  it("shows all prompts when a route exists", () => {
    const shown = visibleQuickPrompts(true);
    expect(shown.length).toBe(QUICK_PROMPTS.length);
    expect(shown.map((p) => p.label)).toContain("Why this route?");
    expect(shown.map((p) => p.label)).toContain("Fare");
  });
});
