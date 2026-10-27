"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "./cn";

/**
 * Sheet — accessible modal surface. Bottom sheet on mobile; centred panel (or
 * right-side panel with `side="right"`) on larger screens. Focus is moved in on
 * open, trapped while open, and restored on close; Escape and backdrop close.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Small line above the title. */
  eyebrow?: ReactNode;
  /** Optional icon shown left of the title. */
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: "center" | "right";
  className?: string;
  /** Accessible label when the title is not plain text. */
  ariaLabel?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  icon,
  children,
  footer,
  side = "center",
  className,
  ariaLabel,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-end justify-center bg-foreground/30 backdrop-blur-[2px]",
        "animate-[fadeIn_200ms_ease-out]",
        side === "right" ? "sm:items-stretch sm:justify-end" : "sm:items-center sm:p-6",
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cn(
          "flex max-h-[88dvh] w-full flex-col overflow-hidden bg-surface outline-none",
          "rounded-t-3xl shadow-[0_-8px_40px_rgba(17,24,39,0.18)]",
          "animate-[sheetUp_240ms_cubic-bezier(0.22,1,0.36,1)]",
          side === "right"
            ? "sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-l-3xl"
            : "sm:max-w-lg sm:rounded-3xl",
          className,
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-navy-700 sm:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
            <div className="min-w-0">
              {eyebrow ? (
                <div className="text-caption font-semibold text-foreground-muted">{eyebrow}</div>
              ) : null}
              <h2 id={titleId} className="break-words font-sans text-title font-semibold text-foreground">
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foreground-muted hover:bg-navy-800 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
        {footer ? <div className="border-t border-border px-5 py-4 sm:px-6">{footer}</div> : null}
      </div>
    </div>
  );
}

export default Sheet;
