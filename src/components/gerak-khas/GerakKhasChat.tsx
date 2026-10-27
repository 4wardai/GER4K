"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { Button, cn } from "@/components/ui";
import { useGerakKhas, nextMessageId } from "./GerakKhasProvider";
import { GerakKhasRobot } from "./GerakKhasRobot";
import { resolveRobotState } from "./robotState";
import { visibleQuickPrompts } from "./quickPrompts";
import type { ChatMessage, GerakKhasResponse } from "@/services/gerak-khas/types";
import { GerakKhasMessage } from "./GerakKhasMessage";

export const OPENING_MESSAGE =
  "Hi, I'm Gerak Khas \u{1F44B} Ask me about your route, stations, buses, fares, walking, crowding or service conditions.";

const MAX_INPUT = 500;

export interface GerakKhasChatProps {
  /**
   * Resolve a question into a structured response. Phase 1 passes a
   * deterministic placeholder responder; Phase 3 passes the orchestrator-backed
   * one. Returns the assistant response (and may run async for the API).
   */
  onAsk: (question: string) => Promise<GerakKhasResponse> | GerakKhasResponse;
  /** Whether a current route exists (controls route-dependent quick prompts). */
  hasRoute: boolean;
  /** Execute a structured action against GER4K state (Phase 3). */
  onAction?: (action: NonNullable<GerakKhasResponse["actions"]>[number]) => void;
}

export function GerakKhasChat({ onAsk, hasRoute, onAction }: GerakKhasChatProps) {
  const {
    open,
    closePanel,
    messages,
    addMessage,
    activity,
    setActivity,
    flashSuccess,
    greeted,
    markGreeted,
    dockEdge,
    journeyContext,
  } = useGerakKhas();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [lenError, setLenError] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Seed the opening message the first time the panel opens in a session.
  useEffect(() => {
    if (open && !greeted) {
      addMessage({ id: nextMessageId(), role: "assistant", text: OPENING_MESSAGE });
      markGreeted();
    }
  }, [open, greeted, addMessage, markGreeted]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function submit(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    if (q.length > MAX_INPUT) {
      setLenError(true);
      return;
    }
    setLenError(false);
    setDraft("");
    addMessage({ id: nextMessageId(), role: "user", text: q });
    setBusy(true);
    setActivity("thinking");
    try {
      const res = await onAsk(q);
      const msg: ChatMessage = {
        id: nextMessageId(),
        role: "assistant",
        text: res.answer,
        response: res,
      };
      addMessage(msg);
      flashSuccess();
    } catch {
      addMessage({
        id: nextMessageId(),
        role: "assistant",
        text: "Sorry, I hit a snag reaching my data just now. Please try again.",
      });
      setActivity("idle");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const robotState = resolveRobotState({
    activity,
    severity: journeyContext?.disruption?.severity ?? "none",
  });
  const prompts = visibleQuickPrompts(hasRoute);

  return (
    <div
      className={cn(
        "fixed z-[58] flex flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[0_-8px_40px_rgba(17,24,39,0.22)]",
        // Mobile: bottom sheet, <=80% height
        "inset-x-0 bottom-0 max-h-[80dvh]",
        // Desktop: compact floating panel anchored near the robot's edge
        "sm:inset-x-auto sm:bottom-5 sm:top-auto sm:max-h-[80dvh] sm:w-[380px] sm:rounded-3xl",
        dockEdge === "right" ? "sm:right-5" : "sm:left-5",
      )}
      role="dialog"
      aria-modal="false"
      aria-label="Gerak Khas mobility co-pilot"
    >
      <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-navy-700 sm:hidden" aria-hidden="true" />
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <GerakKhasRobot state={robotState} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-caption font-bold uppercase tracking-wide text-violet">Gerak Khas</p>
          <p className="truncate text-caption text-foreground-muted">Your mobility co-pilot</p>
        </div>
        <button
          type="button"
          onClick={closePanel}
          aria-label="Close Gerak Khas"
          className="inline-flex size-11 items-center justify-center rounded-full text-foreground-muted hover:bg-navy-800 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
        >
          <span aria-hidden="true" className="text-xl leading-none">&times;</span>
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <GerakKhasMessage key={m.id} message={m} onAction={onAction} />
          ))}
          {busy ? (
            <p className="text-caption text-foreground-muted" role="status">Checking your options…</p>
          ) : null}
        </div>
      </div>

      {prompts.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
          {prompts.map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={busy}
              onClick={() => submit(p.question)}
              className="h-9 rounded-full border border-border bg-surface px-3 text-caption font-semibold text-foreground hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
        className="flex items-center gap-2 border-t border-border px-4 py-3"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Ask Gerak Khas</span>
          <input
            ref={inputRef}
            value={draft}
            maxLength={MAX_INPUT + 1}
            onChange={(e) => {
              setDraft(e.target.value);
              if (lenError) setLenError(false);
            }}
            placeholder="Ask about your route, fares, crowding…"
            aria-invalid={lenError}
            className="h-11 w-full rounded-xl border border-border bg-navy-800/50 px-3.5 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30"
          />
        </label>
        <Button type="submit" aria-label="Send" disabled={!draft.trim() || busy} className="size-11 p-0">
          <Send className="size-5" aria-hidden="true" />
        </Button>
      </form>
      {lenError ? (
        <p className="px-4 pb-2 text-caption text-rose-400">Please keep your question under {MAX_INPUT} characters.</p>
      ) : null}
    </div>
  );
}

export default GerakKhasChat;
