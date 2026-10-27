"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import type { AiExplanationRequest } from "@/services/ai";
import { answerAsk } from "@/services/ai/askAnswer";
import type { AskResponse } from "@/services/ai/askAnswer";
import { Sheet } from "@/components/ui/Sheet";
import { changesText, formatRm, formatWalk } from "@/components/transit/lineStyle";

/**
 * WhyRecommendationSheet — the focused "Why this recommendation?" explanation.
 *
 * Explainability stays part of GER4K, so this sheet REMAINS, but it is NOT the
 * old Ask GER4K co-pilot: no free-text input, no quick-question chips, no
 * follow-up chips, no "Use this route" suggestion, no Ask GER4K branding. It
 * simply reuses the PRESERVED deterministic explanation pipeline
 * (`/api/ask` → {@link answerAsk} fallback) to explain why the recommended
 * option is recommended. The full Ask GER4K co-pilot UI
 * (`@/components/ai/AskGer4kSheet`) and all its underlying logic are preserved
 * for the future Gerak Khas feature; they are simply no longer mounted.
 */
export function WhyRecommendationSheet({
  open,
  onClose,
  title,
  request,
}: {
  open: boolean;
  onClose: () => void;
  /** Destination title, e.g. "via TRX + Pasar Seni". */
  title: string;
  /** The already-built request, or null when there is nothing to explain. */
  request: AiExplanationRequest | null;
}) {
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<AskResponse | null>(null);

  useEffect(() => {
    if (!open || !request) return;
    const controller = new AbortController();
    let alive = true;
    setLoading(true);
    setRes(null);
    fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as AskResponse;
      })
      .then((data) => {
        if (alive) {
          setRes(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!alive || (err instanceof DOMException && err.name === "AbortError")) return;
        // Deterministic offline fallback — same pipeline, computed locally.
        const local = answerAsk(request);
        setRes({ text: local.text, highlights: local.highlights, source: "fallback", answer: local.answer });
        setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [open, request]);

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
      eyebrow="Why this recommendation?"
      title={title}
    >
      {loading || !a ? (
        <div className="flex items-center gap-3 py-8 text-foreground-muted" role="status" aria-live="polite">
          <Loader2 className="size-5 animate-spin text-violet" aria-hidden="true" />
          Explaining this route…
        </div>
      ) : (
        <div className="flex flex-col gap-4" aria-live="polite">
          <p className="text-body text-foreground">{res?.text ?? a.lead}</p>

          {a.metrics ? (
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-heading font-bold text-foreground">{a.metrics.timeMin} min</span>
              {a.metrics.fareSen !== undefined ? (
                <span className="text-title font-semibold text-foreground">{formatRm(a.metrics.fareSen)}</span>
              ) : null}
              <span className="text-body text-foreground-muted">
                {changesText(a.metrics.transfers)} · {formatWalk(a.metrics.walkMeters)} walking
              </span>
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

          <p className="text-[12px] text-foreground-subtle">
            GER4K ranks routes with deterministic logic; this just explains the result.
          </p>
        </div>
      )}
    </Sheet>
  );
}

export default WhyRecommendationSheet;
