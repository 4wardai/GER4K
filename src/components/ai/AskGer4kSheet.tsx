"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Send, Sparkles } from "lucide-react";

import type { AiExplanationRequest } from "@/services/ai";
import { answerAsk } from "@/services/ai/askAnswer";
import type { AskResponse } from "@/services/ai/askAnswer";
import type { PreferenceProfile } from "@/types";
import { Button, cn } from "@/components/ui";
import { Sheet } from "@/components/ui/Sheet";
import { changesText, formatRm, formatWalk } from "@/components/transit/lineStyle";
import { HonestyChip } from "@/components/transit/TransitBits";

/**
 * AskGer4kSheet — the contextual mobility co-pilot (Requirement 31). A sheet,
 * never a tab or chat page. It posts already-computed domain results to
 * `/api/ask` and renders a short, structured, actionable answer. If the API is
 * unreachable it composes the SAME deterministic answer locally. It never
 * invents routes or ranks — suggestions are domain options the passenger can
 * apply in one tap.
 */

export interface AskGer4kSheetProps {
  open: boolean;
  onClose: () => void;
  /** The question that opened the sheet. */
  question: string;
  /** Build the domain request for a question (rebuilt for follow-ups). */
  buildRequest: (question: string) => AiExplanationRequest | null;
  /** Apply a suggested option (and the profile that produced it, if any). */
  onUseSuggestion: (optionId: string, profile?: PreferenceProfile) => void;
}

export function AskGer4kSheet({ open, onClose, question, buildRequest, onUseSuggestion }: AskGer4kSheetProps) {
  const [asked, setAsked] = useState(question);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<AskResponse | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (open) setAsked(question);
  }, [open, question]);

  useEffect(() => {
    if (!open) return;
    const req = buildRequest(asked);
    if (!req) return;
    const controller = new AbortController();
    let alive = true;
    setLoading(true);
    setOffline(false);
    fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as AskResponse;
      })
      .then((data) => {
        if (!alive) return;
        setRes(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive || (err instanceof DOMException && err.name === "AbortError")) return;
        // Offline fallback: the same deterministic pipeline, computed locally.
        const local = answerAsk(req);
        setRes({ text: local.text, highlights: local.highlights, source: "fallback", reranked: local.reranked, answer: local.answer });
        setOffline(true);
        setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
    // buildRequest identity changes each render of the parent; `asked` drives refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asked]);

  function ask(q: string) {
    if (!q.trim() || loading) return;
    setDraft("");
    setAsked(q.trim());
  }

  const a = res?.answer;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      icon={
        <span className="flex size-10 items-center justify-center rounded-full bg-violet/10 text-violet">
          <Sparkles className="size-5" aria-hidden="true" />
        </span>
      }
      eyebrow="Ask GER4K"
      title={asked}
      footer={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
          className="flex items-center gap-2"
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Ask about this journey</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about this journey…"
              className="h-12 w-full rounded-xl border border-border bg-navy-800/50 px-3.5 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30"
            />
          </label>
          <button
            type="submit"
            aria-label="Ask"
            disabled={!draft.trim() || loading}
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
          >
            <Send className="size-5" aria-hidden="true" />
          </button>
        </form>
      }
    >
      {loading || !a ? (
        <div className="flex items-center gap-3 py-8 text-foreground-muted" role="status" aria-live="polite">
          <Loader2 className="size-5 animate-spin text-violet" aria-hidden="true" />
          Checking your options…
        </div>
      ) : (
        <div className="flex flex-col gap-4" aria-live="polite">
          <h3 className="text-heading font-bold leading-tight text-foreground">{a.title}</h3>
          <p className="text-body text-foreground">{res?.text ?? a.lead}</p>

          {a.metrics && !a.suggestion ? (
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-heading font-bold text-foreground">{a.metrics.timeMin} min</span>
              {a.metrics.fareSen !== undefined ? <span className="text-title font-semibold text-foreground">{formatRm(a.metrics.fareSen)}</span> : null}
              <span className="text-body text-foreground-muted">{changesText(a.metrics.transfers)} · {formatWalk(a.metrics.walkMeters)} walking</span>
            </p>
          ) : null}

          {a.bullets.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {a.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-body text-foreground-muted">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground-subtle" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
          ) : null}

          {a.suggestion ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-violet/30 bg-violet/[0.05] px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-caption font-bold uppercase tracking-wide text-violet">Suggested</p>
                  <p className="text-title font-bold text-foreground">{a.suggestion.title}</p>
                </div>
                {a.suggestion.isSimulated ? <HonestyChip tone="simulated">Simulated</HonestyChip> : null}
              </div>
              <p className="text-body text-foreground-muted">
                <span className="font-semibold text-foreground">{a.suggestion.timeMin} min</span>
                {a.suggestion.fareSen !== undefined ? ` · ${formatRm(a.suggestion.fareSen)}` : ""} · {changesText(a.suggestion.transfers)} ·{" "}
                {formatWalk(a.suggestion.walkMeters)} walking
              </p>
              <Button
                size="lg"
                onClick={() => {
                  onUseSuggestion(a.suggestion!.optionId, res?.reranked?.profile ?? a.profile);
                  onClose();
                }}
              >
                Use this route
                <ArrowRight className="size-5" aria-hidden="true" />
              </Button>
            </div>
          ) : null}

          {a.followUps.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-caption font-semibold text-foreground-muted">
                {a.intent === "why_route" ? "Want something easier?" : "Ask next"}
              </p>
              <div className="flex flex-wrap gap-2">
                {a.followUps.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => ask(f.question)}
                    className={cn(
                      "h-10 rounded-full border border-border bg-surface px-3.5 text-caption font-semibold text-foreground",
                      "hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className="text-[12px] text-foreground-subtle">
            {res?.source === "bedrock" ? "Worded by AI from GER4K's results" : "From GER4K's route results"}
            {offline ? " · offline answer" : ""}. GER4K ranks routes itself; Ask GER4K only explains them.
          </p>
        </div>
      )}
    </Sheet>
  );
}

export default AskGer4kSheet;
