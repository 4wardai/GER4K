"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronRight, Gift, Pencil, Star, Trash2, Trophy } from "lucide-react";

import { contributorLevel, nextLevel } from "@/domain/community";
import { MOBILITY_NEEDS } from "@/domain/personal";
import { Button, cn } from "@/components/ui";
import { useGer4kStore } from "@/components/state/Ger4kStore";
import { stationName, useNow } from "@/components/state/useLiveData";
import { journeyHref } from "@/components/alerts/alerts";
import { ProfileChips, profileLabel } from "@/components/journey/RouteCards";
import { HonestyChip } from "@/components/transit/TransitBits";
import { ageText } from "@/components/pulse/pulseCopy";

/**
 * Saved / Profile (Requirements 25, 28, 30): saved journeys, ranking
 * preference, mobility needs, GER4K Points and level, and local data controls.
 * Everything is stored on this device; no account.
 */
export default function ProfileScreen() {
  const store = useGer4kStore();
  const { saved, points, preferredProfile, mobilityNeeds, defaultProfile, hydrated } = store;
  const now = useNow(60_000);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const level = contributorLevel(points.acceptedReports);
  const next = nextLevel(points.acceptedReports);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-heading font-bold tracking-tight text-foreground sm:text-display">Saved &amp; profile</h1>
        <p className="text-body text-foreground-muted">Your journeys, how you like to travel, and your contributions. Stored on this device only.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Saved journeys */}
        <section aria-labelledby="saved-heading" className="flex flex-col gap-3">
          <h2 id="saved-heading" className="text-title font-semibold text-foreground">Saved journeys</h2>
          {!hydrated ? (
            <div className="h-32 animate-pulse rounded-2xl bg-surface" aria-hidden="true" />
          ) : saved.length === 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-surface px-5 py-5">
              <p className="text-body text-foreground">No saved journeys yet.</p>
              <p className="text-caption text-foreground-muted">Plan a trip and tap &ldquo;Save journey&rdquo;. GER4K will alert you on Home if it is disrupted.</p>
              <Link href={journeyHref("putrajaya-sentral", "klcc")} className="inline-flex h-11 w-fit items-center gap-1 rounded-xl bg-violet px-4 text-caption font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2">
                Plan Putrajaya Sentral → KLCC
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {saved.map((s) => (
                <li key={s.id} className="flex min-h-16 items-center gap-3 px-4 py-3">
                  <Star className="size-5 shrink-0 fill-violet text-violet" aria-hidden="true" />
                  {editing === s.id ? (
                    <form
                      className="flex flex-1 items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        store.renameSaved(s.id, draft);
                        setEditing(null);
                      }}
                    >
                      <label className="flex-1">
                        <span className="sr-only">Journey name</span>
                        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} className="h-11 w-full rounded-xl border border-border px-3 text-body focus-visible:border-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30" />
                      </label>
                      <button type="submit" aria-label="Save name" className="inline-flex size-11 items-center justify-center rounded-xl bg-violet text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2">
                        <Check className="size-5" aria-hidden="true" />
                      </button>
                    </form>
                  ) : (
                    <Link href={journeyHref(s.originId, s.destinationId)} className="flex min-w-0 flex-1 flex-col rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet">
                      <span className="text-body font-semibold text-foreground">{s.label}</span>
                      <span className="truncate text-caption text-foreground-muted">{stationName(s.originId)} → {stationName(s.destinationId)}</span>
                    </Link>
                  )}
                  {editing !== s.id ? (
                    <>
                      <button
                        type="button"
                        aria-label={`Rename ${s.label}`}
                        onClick={() => {
                          setEditing(s.id);
                          setDraft(s.label);
                        }}
                        className="inline-flex size-11 items-center justify-center rounded-xl text-foreground-muted hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                      >
                        <Pencil className="size-4.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${s.label}`}
                        onClick={() => store.removeSaved(s.id)}
                        className="inline-flex size-11 items-center justify-center rounded-xl text-foreground-muted hover:bg-navy-800 hover:text-critical focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                      >
                        <Trash2 className="size-4.5" aria-hidden="true" />
                      </button>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Points */}
        <section aria-labelledby="points-heading" className="flex flex-col gap-3">
          <h2 id="points-heading" className="text-title font-semibold text-foreground">GER4K Points</h2>
          <div className="flex flex-col gap-4 rounded-3xl bg-surface px-5 py-5 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-violet/10 text-violet">
                <Trophy className="size-7" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[40px] font-bold leading-none text-foreground">{points.total}</p>
                <p className="text-body font-semibold text-foreground-muted">{level}</p>
              </div>
            </div>
            {next ? (
              <div className="flex flex-col gap-1.5">
                <div className="h-2.5 overflow-hidden rounded-full bg-navy-800" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-violet transition-all"
                    style={{ width: `${Math.round(((points.acceptedReports - (next.level === "Reliable Contributor" ? 0 : 5)) / (next.level === "Reliable Contributor" ? 5 : 15)) * 100)}%` }}
                  />
                </div>
                <p className="text-caption text-foreground-muted">
                  {next.remaining} more report{next.remaining === 1 ? "" : "s"} to reach {next.level}.
                </p>
              </div>
            ) : (
              <p className="text-caption text-foreground-muted">Top contributor level reached. Thank you.</p>
            )}
            {points.history.length > 0 ? (
              <ul className="flex flex-col gap-1 border-t border-border pt-3">
                {points.history.slice(0, 4).map((h, i) => (
                  <li key={`${h.at}-${i}`} className="flex items-center justify-between text-caption">
                    <span className="text-foreground">
                      {h.reportType} at {stationName(h.stationId)} <span className="text-foreground-subtle">· {ageText(h.at, now)}</span>
                    </span>
                    <span className={cn("font-semibold", h.points > 0 ? "text-violet" : "text-foreground-subtle")}>+{h.points}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-caption text-foreground-muted">Report station conditions on Pulse to earn +5 points per report.</p>
            )}
            <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border px-4 py-3">
              <Gift className="mt-0.5 size-5 shrink-0 text-foreground-subtle" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="text-caption font-semibold text-foreground">Future rewards</p>
                <p className="text-caption text-foreground-muted">
                  Points could one day unlock transit perks. Nothing is redeemable today — no vouchers, payments or partners.
                </p>
                <HonestyChip className="self-start">Roadmap concept</HonestyChip>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section aria-labelledby="prefs-heading" className="flex flex-col gap-3">
          <h2 id="prefs-heading" className="text-title font-semibold text-foreground">How GER4K ranks routes for you</h2>
          <div className="flex flex-col gap-3 rounded-3xl bg-surface px-5 py-5">
            <ProfileChips value={preferredProfile} onChange={store.setPreferredProfile} />
            <p className="text-caption text-foreground-muted">
              Default for new searches: <span className="font-semibold text-foreground">{profileLabel(defaultProfile)}</span>
              {defaultProfile !== preferredProfile ? " (set by your mobility needs)" : ""}.
            </p>
          </div>
        </section>

        {/* Mobility needs */}
        <section aria-labelledby="mobility-heading" className="flex flex-col gap-3">
          <h2 id="mobility-heading" className="text-title font-semibold text-foreground">Mobility needs</h2>
          <div className="flex flex-col gap-2 rounded-3xl bg-surface px-5 py-5">
            {MOBILITY_NEEDS.map(({ need, label }) => {
              const on = mobilityNeeds.includes(need);
              return (
                <button
                  key={need}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => store.toggleMobilityNeed(need)}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                >
                  <span className="text-body text-foreground">{label}</span>
                  <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-violet" : "bg-navy-700")} aria-hidden="true">
                    <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", on ? "left-6" : "left-1")} />
                  </span>
                </button>
              );
            })}
            <p className="pt-1 text-caption text-foreground-muted">
              GER4K uses official station accessibility flags and community lift/escalator reports. It has no live lift status, so it never promises a step-free route.
            </p>
          </div>
        </section>
      </div>

      <section aria-labelledby="data-heading" className="flex flex-col gap-3 rounded-3xl border border-border bg-surface px-5 py-5">
        <h2 id="data-heading" className="text-title font-semibold text-foreground">Your data</h2>
        <p className="text-body text-foreground-muted">
          Saved journeys, preferences, points and your own reports live in this browser&rsquo;s local storage. No account, no server.
        </p>
        {confirmClear ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body font-semibold text-foreground">Clear everything on this device?</span>
            <Button
              variant="primary"
              className="bg-critical hover:bg-[#dc2626]"
              onClick={() => {
                store.clearLocalData();
                setConfirmClear(false);
              }}
            >
              Yes, clear
            </Button>
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="secondary" className="self-start" onClick={() => setConfirmClear(true)}>
            Clear local data
          </Button>
        )}
      </section>
    </div>
  );
}
