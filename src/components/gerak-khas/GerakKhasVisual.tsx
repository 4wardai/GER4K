"use client";

import Image from "next/image";

import type { VisualResult } from "@/services/gerak-khas/types";

/**
 * GerakKhasVisual — renders a station visual with its MANDATORY label
 * (Requirement 27). Provenance is `visualType` only; a generated image is never
 * presented as a real photo, and a real photo always shows its attribution.
 */
export function GerakKhasVisual({ visual }: { visual: VisualResult }) {
  const isReal = visual.visualType === "REAL_REFERENCE";
  const src = isReal ? visual.imageUrl : visual.imageData;

  if (!src) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-3.5 py-3 text-body text-foreground-muted">
        {visual.unavailableMessage ?? "No image available for this station yet."}
      </div>
    );
  }

  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="relative aspect-[16/10] w-full bg-navy-800">
        {/* Real images are app-local assets; generated images are data URLs. */}
        {isReal ? (
          <Image src={src} alt={`Reference photo of ${visual.stationName}`} fill className="object-cover" sizes="360px" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`AI illustration of ${visual.stationName}`} className="absolute inset-0 size-full object-cover" />
        )}
      </div>
      <figcaption className="flex flex-col gap-1 px-3.5 py-2.5">
        <span
          className={
            isReal
              ? "w-fit rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-500"
              : "w-fit rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-500"
          }
        >
          {visual.label}
        </span>
        <span className="text-caption font-semibold text-foreground">{visual.stationName}</span>
        {isReal && visual.sourceMeta ? (
          <span className="text-[11px] text-foreground-subtle">
            Source: {visual.sourceMeta.sourceUrl ? (
              <a href={visual.sourceMeta.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                {visual.sourceMeta.attribution}
              </a>
            ) : (
              visual.sourceMeta.attribution
            )}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

export default GerakKhasVisual;
