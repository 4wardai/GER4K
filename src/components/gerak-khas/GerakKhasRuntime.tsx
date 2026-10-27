"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { useGerakKhas, nextMessageId } from "./GerakKhasProvider";
import { GerakKhasChat } from "./GerakKhasChat";
import { useGer4kStore } from "@/components/state/Ger4kStore";
import { useActiveDisruptions } from "@/components/state/useLiveData";
import { orchestrate } from "@/services/gerak-khas/orchestrator";
import { createActionHandler } from "@/services/gerak-khas/actions";
import type { GerakKhasAction, GerakKhasResponse } from "@/services/gerak-khas/types";

/**
 * GerakKhasRuntime — Phase 3 wiring. Resolves questions through
 * `POST /api/gerak-khas` (deterministic + optional AI), with a local
 * deterministic fallback when the endpoint is unreachable, and dispatches
 * structured actions against real GER4K state via the action handler.
 */
export function GerakKhasRuntime() {
  const router = useRouter();
  const {
    journeyContext,
    requestRouteSelection,
    addMessage,
    openPanel,
  } = useGerakKhas();
  const { setPreferredProfile, openStation } = useGer4kStore();
  const disruptions = useActiveDisruptions();

  const hasRoute =
    !!journeyContext?.selectedRouteId || (journeyContext?.options.length ?? 0) > 0;

  const onAsk = useCallback(
    async (question: string): Promise<GerakKhasResponse> => {
      try {
        const res = await fetch("/api/gerak-khas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, context: journeyContext, disruptions }),
        });
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as GerakKhasResponse;
      } catch {
        // Offline / API failure: run the SAME deterministic orchestrator locally.
        return orchestrate({ question, ctx: journeyContext, disruptions });
      }
    },
    [journeyContext, disruptions],
  );

  const onAction = useCallback(
    (action: GerakKhasAction) => {
      const handler = createActionHandler({
        context: journeyContext,
        requestRouteSelection,
        setPreferredProfile,
        openStation,
        navigate: (path) => router.push(path),
        showVisual: async (stationId, mode) => {
          // Phase 4: resolve a visual via the server route, append to transcript.
          try {
            const r = await fetch("/api/gerak-khas/visual", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ stationId, mode: mode === "AI_GENERATED" ? "generated" : "real" }),
            });
            const visual = (await r.json()) as GerakKhasResponse["visual"];
            if (visual) {
              addMessage({
                id: nextMessageId(),
                role: "assistant",
                text: visual.unavailableMessage ?? `Here's ${visual.stationName}.`,
                response: { answer: visual.unavailableMessage ?? `Here's ${visual.stationName}.`, visual, source: { ai: false } },
              });
            }
          } catch {
            addMessage({
              id: nextMessageId(),
              role: "assistant",
              text: "I couldn't load that visual right now, but I can still show the station information I have.",
            });
          }
          openPanel();
        },
        notify: (text) =>
          addMessage({ id: nextMessageId(), role: "assistant", text }),
      });
      handler(action);
    },
    [journeyContext, requestRouteSelection, setPreferredProfile, openStation, router, addMessage, openPanel],
  );

  return <GerakKhasChat onAsk={onAsk} hasRoute={hasRoute} onAction={onAction} />;
}

export default GerakKhasRuntime;
