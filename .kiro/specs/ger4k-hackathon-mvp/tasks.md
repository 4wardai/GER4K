GER4K — Hackathon Implementation Plan

# Implementation Plan: GER4K Hackathon MVP

## Overview

This plan builds GER4K as a sequence of vertical slices that leave the app runnable at each milestone. It is a single **Next.js 15.x + TypeScript App Router** project pinned to the 15.x line (no auto-upgrade to a newer major), styled with **Tailwind CSS** and optionally **shadcn/ui**. State uses built-in React/Next state plus plain `fetch` — no SWR, TanStack Query, or Redux unless proven necessary. API surface is thin handlers, with only `/api/ask` truly needed. All transport and community data flows through a framework-free `DataProvider`, and `MockDataProvider` is the ONLY runtime provider in the MVP. The AI explanation runs through **Amazon Bedrock** server-side with a deterministic fallback, and the app deploys to **AWS Amplify Hosting**. Domain logic is pure and framework-free. Build folders incrementally as each slice needs them.

Each major task carries **Objective / Implementation / Dependency / Done When / Demo Impact / Risk (LOW / MEDIUM / HIGH)** sub-bullets. There are no hour estimates. Tasks use `- [ ] N` and `- [ ] N.N` checkboxes; optional sub-tasks are marked `*`; top-level tasks are never optional; every leaf task ends with `_Requirements: X.Y_`.

## Tasks

- [x] 1. Project Foundation + GER4K Visual Shell
  - **Objective:** Stand up the pinned Next.js project and the GER4K visual shell so every later slice renders inside a polished frame.
  - **Implementation:** Scaffold Next.js 15.x + TS App Router, add Tailwind (+ optional shadcn/ui), design tokens, base primitives, responsive shell, bottom-nav, gated Presenter Control stub, and env documentation.
  - **Dependency:** None
  - **Done When:** The app runs, shows a Home + Pulse shell at mobile and desktop widths, and `.env.example` documents required keys with no real values.
  - **Demo Impact:** Establishes the look and navigation the audience sees throughout the demo.
  - **Risk:** LOW

  - [x] 1.1 Scaffold Next.js 15.x + TS App Router project pinned to 15.x
    - Initialize the project with App Router and TypeScript, Next pinned to the 15.x line (do not auto-upgrade to a newer major)
    - Add `dev` / `build` / `start` / `lint` scripts and a minimal dependency set
    - Remove default boilerplate pages/assets
    - _Requirements: 8.1, 8.2_

  - [x] 1.2 Add Tailwind CSS and optional shadcn/ui
    - Configure Tailwind; optionally install shadcn/ui for a small set of polished primitives
    - _Requirements: 8.1, 8.2_

  - [x] 1.3 Define design tokens and typography
    - Midnight-navy base `#080B14` / `#0D1120` / `#12172A`
    - Violet intelligence accent `#7C3AED` / `#8B5CF6` / `#A855F7`
    - Cyan transit accent `#22D3EE` / `#38BDF8`
    - Success green, warning amber, restrained critical red
    - Inter / Geist / Manrope typography, Lucide icons
    - Expose tokens through the Tailwind theme
    - _Requirements: 8.1, 8.2_

  - [x] 1.4 Build base UI primitives in `src/components/ui`
    - Create reusable presentational primitives (buttons, cards, tags, badges, etc.)
    - _Requirements: 8.1, 8.2_

  - [x] 1.5 Build the responsive shell (mobile-first)
    - Mobile-first at 390px and polished desktop centered at ~1200–1400px
    - _Requirements: 8.1, 8.2_

  - [x] 1.6 Build Home + Pulse bottom-nav shell
    - Bottom navigation with Home and Pulse, no AI tab, optional Profile slot
    - _Requirements: 8.1, 8.2_

  - [x] 1.7 Add gated Presenter Control stub
    - Gate via `?presenter=1` / dev-only / config; activation wiring happens in Phase 4
    - _Requirements: 4.1_

  - [x] 1.8 Document environment configuration
    - Add `.env.example` with Bedrock/AWS keys documented, no real values, server-side only
    - _Requirements: 10.4_

- [x] 2. Shared Models + Demo Fixture
  - **Objective:** Define shared types, the framework-free `DataProvider` interface, and the corrected offline demo fixture behind `MockDataProvider`.
  - **Implementation:** Author shared TS types, the provider interface with documented future providers, and `MockDataProvider` with the corrected fixture and Pulse seeds.
  - **Dependency:** Task 1
  - **Done When:** Domain code can read stations/network/disruptions/reports from `MockDataProvider`, and the demo scenario is fully represented offline.
  - **Demo Impact:** Supplies the single source of truth for every demo screen.
  - **Risk:** MEDIUM

  - [x] 2.1 Define shared TypeScript types in `src/types`
    - `SourceStatus`, `StationCondition`, `PreferenceProfile`, `ConfidenceBand`
    - `Labelled` with independent `sourceStatus` + `isSimulated`
    - `Station`, `JourneyLeg`, `Journey`, `Disruption`, `JourneyImpact`, `ConfidenceFactor`, `JourneyConfidence`, `RankedJourney`, `CommunityReport`, `NewCommunityReport`, `PulseSummary`
    - _Requirements: 2.1, 2.2, 4.2_

  - [x] 2.2 Define the framework-free `DataProvider` interface in `src/data`
    - `getStations` / `getNetwork` / `getDisruptions` / `getReports` / `submitReport`
    - No React/Next imports
    - Comment that `StaticGtfsProvider` / `LiveTransportProvider` / real `CommunityProvider` are future and not built
    - _Requirements: 1.4, 3.4, 5.5, 2.1_

  - [x] 2.3 Implement `MockDataProvider` + corrected demo fixture
    - `MockDataProvider` is the ONLY runtime provider and means a predictable LOCAL provider, NOT inventing rail data
    - During DEVELOPMENT ONLY, use the official GTFS Static rapid-rail-kl at https://developer.data.gov.my/realtime-api/gtfs-static to verify/extract stations, lines, stop relationships, and schedule
    - Dev flow: Official GTFS Static → dev-time inspection/extraction → small GER4K-specific local fixture → MockDataProvider → GER4K
    - NO production GTFS parser; demo works fully offline with no external endpoint runtime dependency
    - Do NOT model the whole Klang Valley — only Putrajaya Sentral, Chan Sow Lin, TRX, Conlay, Ampang Park, Pasar Seni, Masjid Jamek, KLCC + strictly required intermediates
    - Label unextracted travel times "demo fixture estimate"; official static records `sourceStatus = SCHEDULED`, `isSimulated = false`; preserve attribution notes
    - Fixture baseline: Putrajaya Sentral → Ampang Park → KLCC (Putrajaya Line through TRX–Conlay, interchange at Ampang Park to Kelana Jaya Line)
    - Simulated TRX–Conlay Putrajaya Line disruption: `isSimulated = true`, `sourceStatus = UNVERIFIED`, severity Severe disruption
    - Alt A via Pasar Seni (leaves Putrajaya Line at TRX → Kajang Line → Pasar Seni → Kelana Jaya Line → KLCC)
    - Alt B via Masjid Jamek (leaves at Chan Sow Lin → Ampang/Sri Petaling Line → Masjid Jamek → Kelana Jaya Line → KLCC)
    - Recovery legs SCHEDULED / false
    - Tune A ~34min / 2 / ~520m and B ~41min / 2 / ~260m so Fastest favours A and Least Walking favours B
    - Pulse seeds TRX = Packed, Chan Sow Lin = Busy, optional Pasar Seni, as SEEDED demo reports → `sourceStatus = COMMUNITY_REPORTED` AND `isSimulated = true`; UI communicates the demo/simulated nature, not real passengers
    - _Requirements: 1.4, 2.1, 4.2, 4.4, 4.5, 5.5, 7.1_

  - [ ]* 2.4 Write Vitest unit tests for MockDataProvider + label invariants
    - Verify fixture contents and the two-axis label invariants
    - _Requirements: 4.4, 4.5, 2.1_

- [x] 3. Normal Journey Vertical Slice
  - **Objective:** Deliver the normal-day plan so the app renders a baseline Putrajaya Sentral → KLCC journey end-to-end.
  - **Implementation:** Build the pure Journey_Planner domain, origin/destination selection on Home, and the journey timeline + summary card.
  - **Dependency:** Task 2
  - **Done When:** A user can plan the default demo O/D and see an ordered, labelled baseline timeline.
  - **Demo Impact:** Step 1 of the demo chain — the normal journey.
  - **Risk:** MEDIUM

  - [x] 3.1 Implement the Journey_Planner domain
    - Build ordered legs and totals; return NoRouteFound where no plan is possible; pure and framework-free
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 3.2 Write Vitest unit test for normal journey generation
    - Assert the baseline legs and totals
    - _Requirements: 1.1, 1.2_

  - [x] 3.3 Add origin/destination selection on Home
    - Provide O/D selection with the default demo O/D preselected
    - _Requirements: 1.1_

  - [x] 3.4 Build JourneyTimeline + summary card for normal service
    - Render the normal-service timeline with a SourceStatusTag; SCHEDULED is never shown as LIVE; responsive
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 8.1, 8.2, 8.3_

- [x] 4. CHECKPOINT A — NORMAL DAY WORKS
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Simulated Disruption + Impact Detection
  - **Objective:** Let the presenter activate the simulated disruption and have GER4K mark the baseline journey affected.
  - **Implementation:** Wire Presenter/Demo Control, build the Disruption_Monitor, and add the simulated banner and affected-leg highlight UI.
  - **Dependency:** Task 3
  - **Done When:** Activating the Demo_Scenario marks the baseline journey affected and highlights the correct legs with honest labels.
  - **Demo Impact:** Steps 2–3 of the demo chain — the bad day begins.
  - **Risk:** MEDIUM

  - [x] 5.1 Wire Presenter/Demo Control activate + reset
    - Hook the gated control to activate and reset the Demo_Scenario
    - _Requirements: 4.1, 4.2_

  - [x] 5.2 Implement Disruption_Monitor
    - Produce JourneyImpact with `affected` + `affectedLegIndexes`; affected when a leg traverses TRX–Conlay; read via the DataProvider
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.6_

  - [ ]* 5.3 Write Vitest unit test for disruption detection
    - Assert affected flag and affected leg indexes
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 5.4 Build SimulatedBanner + SourceStatusTag (isSimulated-driven)
    - Banner driven by `isSimulated`; UNVERIFIED never shown as OPERATOR_CONFIRMED; label + icon, not color alone
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 2.1, 2.2, 2.3, 8.4_

  - [x] 5.5 Build disruption alert UI + affected-leg highlight
    - Restrained red only on affected legs; calm 150–300ms transitions; responsive
    - _Requirements: 3.2, 2.2, 2.3, 8.1, 8.2, 8.3, 8.4_

- [x] 6. CHECKPOINT B — BAD DAY WORKS
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Recovery Engine (deterministic, no AI)
  - **Objective:** Generate deterministic recovery alternatives that avoid the blocked segment.
  - **Implementation:** Build the Recovery_Engine domain with Alt A and Alt B, validation that alternatives avoid TRX–Conlay, and NoAlternativeFound handling.
  - **Dependency:** Task 5
  - **Done When:** The engine returns ≥2 valid alternatives for the demo disruption, all avoiding the blocked segment.
  - **Demo Impact:** Step 4 of the demo chain — recovery options exist.
  - **Risk:** MEDIUM

  - [x] 7.1 Implement the Recovery_Engine domain
    - Alt A via Pasar Seni, Alt B via Masjid Jamek, with correct totals; return ≥2 when supported
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [x] 7.2 Validate alternatives avoid TRX–Conlay + NoAlternativeFound
    - Ensure no alternative traverses the blocked segment; return NoAlternativeFound when none exists
    - _Requirements: 5.1, 5.4_

  - [ ]* 7.3 Write Vitest unit test for recovery alternatives
    - Normal Vitest unit test (NOT a property test)
    - _Requirements: 5.1, 5.4_

- [ ] 8. Ranking + Confidence
  - **Objective:** Rank alternatives deterministically by preference and attach an explainable confidence indicator.
  - **Implementation:** Build the Ranking_Engine and Confidence_Indicator domains with the defined weights, tie-breaks, and bands.
  - **Dependency:** Task 7
  - **Done When:** Fastest favours A, Least Walking favours B, and each alternative has a clamped, banded confidence with factors.
  - **Demo Impact:** Steps 5–6 of the demo chain — ranked comparison and re-rank.
  - **Risk:** MEDIUM

  - [x] 8.1 Implement the Ranking_Engine
    - Weighted min–max normalized cost; weights Balanced 1/1/1, Fastest 3/0.5/0.5, Least Walking 0.5/0.5/3, Fewest Transfers 0.5/3/0.5
    - Tie-break shortest `travelTimeMin` then stable id; re-ranks the same set; independent of AI
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [ ]* 8.2 Write Vitest unit test for deterministic ranking
    - Fastest → A, Least Walking → B, defined tie-break (NOT a property test)
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 8.3 Implement the Confidence_Indicator
    - Base 60 + additive deltas clamped [0,100]; bands High ≥75 / Medium 50–74 / Low <50; `factors[]`; explainable indicator NOT probability
    - _Requirements: 6.4_

  - [ ]* 8.4 Write Vitest unit test for confidence boundaries
    - Boundaries 74/75 and 49/50; factors sum to the clamped score (NOT a property test)
    - _Requirements: 6.4_

- [x] 9. CHECKPOINT C — GER4K'S CORE VALUE WORKS
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Hero Recovery Experience
  - **Objective:** Present the ranked recovery as a polished hero experience with option cards and preference chips.
  - **Implementation:** Build RecoveryHeroCard, RecoveryOptionCard, PreferenceChips, and assemble the Recovery view.
  - **Dependency:** Task 8
  - **Done When:** The recovery view shows the hero recommendation, ≥2 option cards, and visibly re-ranks on preference change at both viewports.
  - **Demo Impact:** Steps 4–6 of the demo chain rendered as the product hero moment.
  - **Risk:** MEDIUM

  - [x] 10.1 Build RecoveryHeroCard
    - Hierarchy affected → recommends → action → time → confidence; ConfidenceBadge + SourceStatusTag
    - _Requirements: 6.4, 6.5, 2.2, 2.3, 8.1, 8.2_

  - [x] 10.2 Build RecoveryOptionCard + ConfidenceBadge + SourceStatusTag
    - Time / transfers / walking, band, source tag; "Why this option" / "Why this confidence" wired in Phase 9; 0–100 score + band + reveal
    - _Requirements: 6.4, 6.5, 2.1, 2.2, 2.3, 8.3_

  - [x] 10.3 Build PreferenceChips wired to deterministic re-rank
    - Chips trigger the deterministic Ranking_Engine re-rank
    - _Requirements: 6.2, 6.3_

  - [x] 10.4 Assemble the Recovery view
    - Affected-route timeline with red only on affected legs, hero, option cards, chips, "Use this route" / "See other options"; mobile + desktop/projector
    - _Requirements: 3.2, 6.1, 6.5, 8.1, 8.2, 8.3, 8.4_

- [x] 11. Station Pulse (aggregation-first)
  - **Objective:** Deliver aggregation-first Station Pulse summaries along the recovery route.
  - **Implementation:** Build the Pulse_Aggregator domain, the StationPulseCard + Pulse page, and the optional submission flow.
  - **Dependency:** Task 10
  - **Done When:** Pulse shows aggregated condition, count, freshness, and confidence for seeded stations with honest demo labelling.
  - **Demo Impact:** Step 7 of the demo chain — community intelligence.
  - **Risk:** MEDIUM

  - [x] 11.1 Implement the Pulse_Aggregator domain
    - 30-min window, severity map, last-10-min double weight, cautious tie-break to worse, empty → Normal/Low
    - Pulse confidence bands High ≤10min & ≥3 / Medium ≤30min & ≥1 / Low otherwise
    - PulseSummary with `reportCount` / `mostRecentAt` / `condition` / `confidence`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 11.2 Write Vitest unit test for Pulse aggregation
    - TRX = Packed, Chan Sow Lin = Busy, cautious tie-break, empty → Normal/Low
    - _Requirements: 7.2, 7.4_

  - [x] 11.3 Build StationPulseCard (aggregation-first) + Pulse page
    - Aggregated condition / count / freshness / confidence, optional simple trend; individual reports secondary/collapsed; source/status visible including the demo/simulated nature of seeds
    - Reads like "TRX / Packed / 12 recent reports / Updated recently / High confidence"; responsive
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 2.1, 2.2, 2.3, 8.1, 8.2, 8.3_

  - [ ]* 11.4 Build Station Pulse report submission (SHOULD HAVE)
    - New running-prototype report starts `sourceStatus = UNVERIFIED` AND `isSimulated = false`; no auto-promotion to COMMUNITY_REPORTED (verification future); reject a missing required field naming it
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 11.5 Write Vitest unit test for new-report submission
    - New report UNVERIFIED + `isSimulated = false`; missing field rejected naming the field
    - _Requirements: 9.2, 9.4_

- [x] 12. CHECKPOINT D — COMMUNITY INTELLIGENCE WORKS
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Contextual Ask GER4K
  - **Objective:** Add the contextual Ask GER4K explanation with Bedrock server-side and a deterministic fallback.
  - **Implementation:** Build the AI service behind a provider interface, the thin `/api/ask` handler, and the contextual AskGer4kSheet.
  - **Dependency:** Task 11
  - **Done When:** Ask GER4K returns a structured explanation (AI or deterministic fallback) without ever computing rankings.
  - **Demo Impact:** Step 8 of the demo chain — the plain-language explanation.
  - **Risk:** MEDIUM

  - [x] 13.1 Build the AI service behind a provider interface in `src/services/ai`
    - Bedrock server-side only, no exposed creds; consumes domain results; explains/personalizes only
    - _Requirements: 10.1, 10.4_

  - [x] 13.2 Build the thin `/api/ask` handler with deterministic fallback
    - Validate input, pass domain results, fallback from confidence factors + comparison attributes; map NL preference to PreferenceProfile and request a re-rank; does not compute ranking
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 13.3 Build the contextual AskGer4kSheet + entry points
    - Sheet not tab; entry from recovery / alternative cards / confidence reveal / Pulse; structured actionable answers; never invents routes / computes rankings / overrides domain
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 13.4 Write Vitest unit test for deterministic fallback explanation
    - Assert the deterministic fallback text from factors and attributes
    - _Requirements: 10.3_

- [x] 14. Supporting Features (only when the full chain works)
  - **Objective:** Add optional supporting features once the core chain is proven, without blocking the demo.
  - **Implementation:** Optional community submission, trust-points animation, saved journeys, deferred-capability guardrail check, and an optional historical demand index.
  - **Dependency:** Task 13
  - **Done When:** Any implemented supporting feature works and the deferred-capability exclusions are confirmed.
  - **Demo Impact:** Nice-to-have polish layered on top of the complete demo chain.
  - **Risk:** LOW

  - [ ]* 14.1 Build community report submission (SHOULD HAVE, if 11.4 skipped)
    - New report UNVERIFIED + `isSimulated = false`; no auto-promotion; required-field rejection naming the field
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 14.2 Build lightweight trust points (NICE TO HAVE)
    - "+5 GER4K Points" animation; no economy / persistence
    - _Requirements: 11.1, 11.2_

  - [ ]* 14.3 Build saved journeys (NICE TO HAVE)
    - No auth / production persistence
    - _Requirements: 12.1, 12.2_

  - [x] 14.4 Confirm deferred capabilities excluded
    - Proactive alerts / mature verification / reward persistence / full live-feed / operator-authority tooling; guardrail check, no code
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ]* 14.5 Build OPTIONAL Historical Demand Index
    - Use https://data.gov.my/data-catalogue/ridership_od_rapidrail_daily; small explainable index; HISTORICAL not realtime; output e.g. "Historical Demand: HIGH/MEDIUM/LOW"; OPTIONAL and outside the critical path, only after the end-to-end demo works; labelled HISTORICAL never LIVE; no ML merely to use it; skip if it doesn't materially strengthen the demo
    - _Requirements: 2.3 (supporting/contextual)_

- [x] 15. Demo Polish
  - **Objective:** A product-quality pass that makes the completed core demo chain look and feel winning.
  - **Implementation:** Tighten spacing/typography/touch-target/status-icon consistency; loading/empty/error states; disruption transitions; preference-chip interaction; recovery-card & Pulse hierarchy; Ask GER4K presentation; responsiveness; keyboard focus; contrast; no horizontal scroll; no placeholder dev text; no default Next styling.
  - **Dependency:** Task 13 (the completed core demo chain through Contextual Ask GER4K), explicitly NOT Task 14. Task 14 supporting features must not block Demo Polish or Checkpoint E.
  - **Done When:** Reviewed at ~390px and ~1280px with consistent spacing, states, transitions, focus, and contrast, and no placeholder or default styling.
  - **Demo Impact:** Turns the working chain into a presentation-ready experience.
  - **Risk:** LOW

  - [x] 15.1 Perform the product-quality polish pass
    - Spacing / typography / touch-target / status-icon consistency; loading / empty / error states; disruption transitions; preference-chip interaction; recovery-card & Pulse hierarchy; Ask GER4K presentation; mobile + desktop/projector responsiveness; keyboard focus; contrast; no horizontal scroll; no placeholder dev text; no default Next styling
    - Review at ~390px and ~1280px
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 16. Focused Testing
  - **Objective:** Run a small focused Vitest suite plus one happy-path smoke test to lock in the polished demo.
  - **Implementation:** Single-run `vitest run`, NO heavy PBT and no fast-check; verify core coverage and add one end-to-end smoke test.
  - **Dependency:** Task 15
  - **Done When:** The focused suite and the happy-path smoke test pass in a single run.
  - **Demo Impact:** Confidence that the demo chain holds together before the final checkpoint.
  - **Risk:** MEDIUM

  - [x] 16.1 Verify focused coverage with a small single-run Vitest suite
    - Single-run `vitest run`, NO heavy PBT, no fast-check
    - Verify coverage: normal journey generation, disruption detection, recovery avoids TRX–Conlay, deterministic preference ranking, confidence boundaries/calculation, Pulse aggregation, new reports start UNVERIFIED if submission exists
    - _Requirements: 1.1, 1.2, 3.1, 5.2, 6.1, 7.1_

  - [x] 16.2 Add ONE happy-path end-to-end smoke test
    - Plan → trigger disruption → detect affected → generate recovery → rank → preference re-rank → Pulse → deterministic explanation
    - _Requirements: 1.1, 1.2, 3.1, 5.2, 6.1, 7.1_

- [x] 17. CHECKPOINT E — WINNING DEMO READY
  - Passed only when the polished local demo works AND the focused Vitest suite / happy-path smoke test passes.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. AWS Deployment + Demo Hardening
  - **Objective:** Deploy the proven local demo to AWS Amplify Hosting and harden it for the live presentation.
  - **Implementation:** Production build check, env-var validation, Amplify deploy, server-side Bedrock config, AI fallback verification, secret checks, deployed-site device checks, Presenter Control + reset verification, and a full rehearsal.
  - **Dependency:** Task 17 (after the local demo works)
  - **Done When:** The deployed site runs the full happy path from a clean state on mobile and laptop/projector with no exposed secrets.
  - **Demo Impact:** The environment the judges actually see on demo day.
  - **Risk:** HIGH

  - [x] 18.1 Deploy and harden on AWS Amplify Hosting
    - Production build check; env-var validation; AWS Amplify Hosting deploy; Bedrock server-side config if available; AI fallback verification; no exposed secrets; mobile + laptop/projector deployed-site checks; Presenter Control verification; reset-demo verification; full happy-path rehearsal from a clean state
    - No Kubernetes / VPC / microservices / complex CI-CD / DynamoDB unless needed
    - _Requirements: 10.3, 10.4, 8.1, 8.2_

# FULL VISION PROTOTYPE — Expansion Plan

Tasks 1–18 above are the CORE / ALREADY WORKING tier and keep their statuses.
The tasks below grow GER4K into the full-vision mobility companion. Order
follows the expansion priority (fare → comparison → profiles → map → multimodal
→ Home/journey UX → recovery → Pulse → reporting → points → Service →
historical demand → saved journeys → alerts → mobility needs → ride-hail → Ask
→ profile → polish). Every task keeps the existing demo working and every CORE
test passing.

- [x] 19. Full Vision Data Foundation
  - **Objective:** Extend shared types, the fixture and the DataProvider so the new domain modules have honest, offline data.
  - **Implementation:** Optional type extensions; new stations (Persiaran KLCC, Bukit Bintang, Merdeka) with split segments preserving CORE totals; demo segment fares; GTFS station metadata; multimodal overlay (bus 300, simulated replacement bus, walk link); re-anchored Pulse seeds + scenario-only seeds; historical demand fixture; line metadata; extraction scripts.
  - **Dependency:** Task 17
  - **Done When:** All CORE tests still pass and the new provider methods return labelled data.
  - **Demo Impact:** Every later screen reads from this.
  - **Risk:** MEDIUM

  - [x] 19.1 Extend shared types (SourceStatus HISTORICAL/ESTIMATED, 3 new profiles, optional journey/network/report fields, fare/options/service/profile types)
    - _Requirements: 14.1, 15.1, 16.1, 18.1, 25.1, 33.1_
  - [x] 19.2 Extend the CORE fixture (new stations, split segments, demo fares, GTFS codes/coords/isOKU, re-anchored and scenario seeds)
    - CORE totals unchanged: 28/1/180, 34/2/520, 41/2/260
    - _Requirements: 14.3, 17.1, 24.2, 30.3_
  - [x] 19.3 Add multimodal overlay, line metadata, fare rules and historical demand fixtures + dev-time extraction scripts in `scripts/data/`
    - _Requirements: 18.2, 18.3, 26.1, 26.4, 27.1_
  - [x] 19.4 Extend DataProvider + MockDataProvider (`getMultimodalNetwork`, `getScenarioReports`, `getLineInfo`, `getHistoricalDemand`, `getFareRules`, `restoreReports`)
    - _Requirements: 1.4, 18.1, 35.1_

- [x] 20. Fare / Journey Cost Model
  - **Objective:** Deterministic fare estimate + breakdown for every option.
  - **Implementation:** `src/domain/fare` Fare_Engine (integrated rail fare, bus flat fare, free replacement bus), ESTIMATED labels.
  - **Dependency:** Task 19
  - **Done When:** Baseline RM4.20, Alt A RM4.40, Alt B RM4.20 in tests.
  - **Demo Impact:** Cost comparison on every route.
  - **Risk:** LOW

  - [x] 20.1 Implement the Fare_Engine
    - _Requirements: 14.1, 14.2, 14.3_
  - [x] 20.2 Vitest: fare totals and breakdown
    - _Requirements: 14.1_

- [x] 21. Richer Comparison Attributes + Expanded Preference Profiles
  - **Objective:** Extend the Ranking_Engine with fare, crowd and accessibility attributes and the Cheapest / Avoid Crowding / Accessible profiles.
  - **Implementation:** Extended weights table; missing attributes constant; CORE ranking tests unchanged.
  - **Dependency:** Task 20
  - **Done When:** New-profile tests pass and the MVP A/B ordering is unchanged.
  - **Demo Impact:** Seven chips visibly re-rank routes.
  - **Risk:** MEDIUM

  - [x] 21.1 Extend Ranking_Engine weights and attributes
    - _Requirements: 16.1, 16.2, 16.3_
  - [x] 21.2 Recognise HISTORICAL / ESTIMATED in the Confidence_Indicator
    - _Requirements: 32.4_
  - [x] 21.3 Vitest: new profiles + backward compatibility
    - _Requirements: 16.2, 16.3_

- [x] 22. Journey Options Engine (multimodal, normal + recovery) + Ride-hail Fallback
  - **Objective:** Enumerate, validate, enrich, filter and tag meaningful multimodal options.
  - **Implementation:** `src/domain/options` (segment-removal enumeration over CORE planner, walk access/egress, CORE avoid-validation + CORE findRecovery union, Pareto filter, strategy tags, unique ids, titles) and the ride-hail estimator.
  - **Dependency:** Task 21
  - **Done When:** Normal and recovery outcomes match the design table.
  - **Demo Impact:** The comparison the audience sees.
  - **Risk:** HIGH

  - [x] 22.1 Implement route enumeration and option enrichment
    - _Requirements: 15.1, 15.2, 18.1, 18.5_
  - [x] 22.2 Implement Pareto filter, meaningful set and strategy tags
    - _Requirements: 15.4, 15.5, 22.3_
  - [x] 22.3 Implement the ride-hail fallback estimator
    - _Requirements: 23.1, 23.2, 23.3_
  - [x] 22.4 Vitest: normal + recovery outcomes, profile heroes, avoid-blocked, ride-hail ranges
    - _Requirements: 15.4, 16.1, 18.5, 23.2_

- [x] 23. Community, Points, Service, Demand, Alerts and Mobility Domain
  - **Objective:** Pure domain support for the remaining passenger features.
  - **Implementation:** Report types + mapping, station pulse detail (trend/signals), report validation, points/levels, historical demand bands, line status, saved-journey alerts, mobility-needs mapping.
  - **Dependency:** Task 19
  - **Done When:** Each module has focused tests passing.
  - **Demo Impact:** Pulse, Service, Saved and alerts all have real logic.
  - **Risk:** MEDIUM

  - [x] 23.1 Station report types, pulse detail (trend, signals) and validation
    - _Requirements: 24.2, 24.3, 25.1, 25.3, 25.8_
  - [x] 23.2 Points and contributor levels (duplicate rule)
    - _Requirements: 25.4, 25.5, 25.6_
  - [x] 23.3 Historical demand bands
    - _Requirements: 27.2, 27.3_
  - [x] 23.4 Line status derivation
    - _Requirements: 26.1, 26.2, 26.3_
  - [x] 23.5 Saved-journey alerts and mobility-needs mapping
    - _Requirements: 29.1, 29.2, 30.2_
  - [x] 23.6 Vitest for 23.1–23.5
    - _Requirements: 25.2, 27.2, 29.2, 30.2_

- [x] 24. Ask GER4K Co-Pilot (domain + API)
  - **Objective:** Intent mapping and structured deterministic answers, reused by `/api/ask` and as a client-side fallback.
  - **Implementation:** `src/services/ai/askAnswer.ts`, extended request validation (new profiles, optional attributes), Bedrock rephrasing of `lead` only.
  - **Dependency:** Task 22
  - **Done When:** Each supported question yields a structured answer; AI never ranks.
  - **Demo Impact:** "Why this route?", "Can I avoid TRX?", "Is there a bus option?" all answer usefully.
  - **Risk:** MEDIUM

  - [x] 24.1 Implement intents + deterministic structured answers
    - _Requirements: 31.2, 31.3, 31.5_
  - [x] 24.2 Extend `/api/ask` (validation, re-rank via domain, structured answer, AI rephrase only)
    - _Requirements: 10.4, 16.4, 31.3, 31.5_
  - [x] 24.3 Vitest: intent mapping and answers
    - _Requirements: 31.2, 31.3_

- [x] 25. CHECKPOINT F — FULL-VISION DOMAIN VERIFIED
  - All CORE + new domain tests pass in a single `vitest run`.

- [x] 26. App Shell, Navigation and Local State
  - **Objective:** Consumer mobility shell with Home · Pulse · Service · Saved and a local store.
  - **Implementation:** Rebuilt AppShell (desktop top bar, mobile bottom bar), `Ger4kStore` context (saved, recents, profile, mobility needs, points, reports replay; localStorage with in-memory fallback), global station sheet host, prototype alert banner, Presenter "Clear local data".
  - **Dependency:** Task 25
  - **Done When:** All four tabs navigate; state survives reload.
  - **Demo Impact:** Feels like a real app.
  - **Risk:** MEDIUM

  - [x] 26.1 Rebuild AppShell + navigation (4 tabs, desktop top bar)
    - _Requirements: 34.1_
  - [x] 26.2 Implement Ger4kStore (localStorage, fallback) and global overlays host
    - _Requirements: 28.1, 35.2_
  - [x] 26.3 Update Presenter Control (activate / reset / clear local data)
    - _Requirements: 35.3, 4.1_

- [x] 27. Transit Map / Schematic
  - **Objective:** Offline SVG map showing routes, disruption, branches and Pulse markers.
  - **Dependency:** Task 26
  - **Done When:** Selected option highlights, disruption shows dashed + ✕ + label, markers open the station sheet.
  - **Demo Impact:** Disruption recovery becomes spatial.
  - **Risk:** MEDIUM

  - [x] 27.1 Build TransitMap (projection, line colours, highlight, disruption, markers, keyboard access)
    - _Requirements: 17.1–17.6_

- [x] 28. Home + Journey Search
  - **Objective:** Search-first Home with saved/recent journeys, service status, nearby transport and proactive alert.
  - **Dependency:** Task 27
  - **Done When:** Home works at 390px and 1280px; search opens `/journey`.
  - **Demo Impact:** Steps 1–4 of the target demo.
  - **Risk:** MEDIUM

  - [x] 28.1 Build JourneySearch (station picker, recents, saved, swap, depart/arrive time)
    - _Requirements: 20.1, 20.2, 20.3_
  - [x] 28.2 Build HomeScreen (search hero, alert, saved/recent, service, nearby)
    - _Requirements: 19.1–19.4, 29.2_

- [x] 29. Journey Results + In-Place Recovery
  - **Objective:** One journey surface that plans normally and transitions into recovery mode.
  - **Dependency:** Task 28
  - **Done When:** Normal strategies, recovery hero + alternatives, ride-hail row, profile chips, map updates, steps, fare breakdown, journey mode and save all work.
  - **Demo Impact:** Steps 5–14 of the target demo.
  - **Risk:** HIGH

  - [x] 29.1 Build JourneyScreen layout (desktop split / mobile map + sheet)
    - _Requirements: 21.1, 34.2, 34.3_
  - [x] 29.2 Build RouteHero, RouteOptionRow, RouteSequence, RouteSteps, FareBreakdown, ConfidenceSummary, ProfileChips
    - _Requirements: 14.4, 15.3, 21.2, 21.3, 32.1, 32.2, 33.2_
  - [x] 29.3 Build recovery mode (JourneyChangedBanner, recommend hero, alternatives, RideHailRow, original route disclosure)
    - _Requirements: 22.1–22.5, 23.3_
  - [x] 29.4 Build journey mode ("Start this route") with simulated live arrivals and Save journey
    - _Requirements: 18.4, 21.4, 21.5, 28.1_

- [x] 30. Contextual Station Pulse + Reporting + Points UI
  - **Objective:** Pulse inside the journey, a global station sheet, quick structured reporting and the points thank-you.
  - **Dependency:** Task 29
  - **Done When:** TRX opens Packed / 12 reports / freshness / confidence / trend; reporting awards +5.
  - **Demo Impact:** Steps 15–18.
  - **Risk:** MEDIUM

  - [x] 30.1 Build StationSheet (summary, trend, signals, historical demand, reports)
    - _Requirements: 24.1, 24.2, 27.3, 27.4_
  - [x] 30.2 Build QuickReport + points thank-you
    - _Requirements: 25.1–25.6_
  - [x] 30.3 Redesign the Pulse screen
    - _Requirements: 24.4_

- [x] 31. Service / Lines
  - **Objective:** Line list and layered line detail.
  - **Dependency:** Task 30
  - **Done When:** Putrajaya Line shows the simulated disruption with Service notice → Community → GER4K layers.
  - **Demo Impact:** Steps 19–20.
  - **Risk:** LOW

  - [x] 31.1 Build Service list + line detail + bus routes
    - _Requirements: 26.1–26.4_

- [x] 32. Saved / Profile
  - **Objective:** Saved journeys, preferences, mobility needs, points and level, roadmap concept, local data controls.
  - **Dependency:** Task 30
  - **Done When:** Saved journeys re-plan; mobility needs change the default profile.
  - **Demo Impact:** Steps 22–23.
  - **Risk:** LOW

  - [x] 32.1 Build the Saved/Profile screen
    - _Requirements: 25.5, 25.7, 28.1–28.3, 30.1, 30.2_

- [x] 33. Ask GER4K Co-Pilot UI
  - **Objective:** Structured, actionable contextual answers with "Use this route".
  - **Dependency:** Task 29
  - **Done When:** Each supported question renders a concise answer; suggestions apply in one tap; offline fallback works.
  - **Demo Impact:** Step 21.
  - **Risk:** MEDIUM

  - [x] 33.1 Rebuild AskGer4kSheet + request builder + entry points
    - _Requirements: 31.1–31.6_

- [x] 34. Final Responsive UI/UX Polish + Verification
  - **Objective:** Consistent, calm, projector-readable experience.
  - **Implementation:** Remove obsolete components, check 390px and 1280px, focus, contrast, no horizontal scroll, typography scale, build + lint + tests.
  - **Dependency:** Tasks 31–33
  - **Done When:** `npm run build`, `npm run lint`, `vitest run` pass and the 24-step demo works.
  - **Risk:** MEDIUM

  - [x] 34.1 Polish pass and obsolete-component cleanup
    - _Requirements: 34.1–34.5_
  - [x] 34.2 Full-vision smoke test (domain-level 24-step chain)
    - _Requirements: 15.4, 22.2, 25.2, 29.2_

- [x] 35. CHECKPOINT G — FULL VISION DEMO READY
  - The Target Full-Vision Demo below runs end to end; all tests pass.

# FRONTEND REDESIGN PHASE — Implementation Plan

Presentation-only phase on top of the completed Full Vision Prototype (tasks
1–35, preserved). Makes GER4K feel like a premium KL mobility product by fixing
hierarchy, polish and transport UX. NO domain/data/fixture/type/test/deployment
changes. Gerak Khas is NOT built here. The existing Vitest suite and the
production build must keep passing after every task.

- [x] 36. Design tokens + shared transit presentation primitives
  - **Objective:** Strengthen the type scale and add the reusable mode / bus / section primitives the screens will compose.
  - **Implementation:** Extend globals.css type scale (hero ETA, metric) and a soft elevation token; add `TransportModeSequence`, `BusArrivalCard`, `SectionHeader`, `StatCluster`, `ServiceStatusRow`. All wrap existing data; compute nothing.
  - **Dependency:** Task 35
  - **Done When:** Primitives render in isolation and `tsc`/build pass; no domain import added.
  - **Risk:** LOW

  - [x] 36.1 Extend design tokens and add elevation in globals.css
    - _Requirements: 37.1, 37.4_
  - [x] 36.2 Add TransportModeSequence + BusArrivalCard (icon + official line colour; honest source label)
    - _Requirements: 40.2, 40.3_
  - [x] 36.3 Add SectionHeader, StatCluster, ServiceStatusRow
    - _Requirements: 37.2, 39.4, 40.1_

- [x] 37. Transit map readability
  - **Objective:** Make labels proportional and tier station prominence while keeping the offline SVG schematic.
  - **Implementation:** Enlarge the viewBox/projection, shrink + tier label sizes, show full labels for relevant stations when a route is selected, keep thickness/disruption/pulse emphasis, reposition the legend.
  - **Dependency:** Task 36
  - **Done When:** Labels no longer dominate at 1280px; selected route, disruption and Pulse read clearly; mobile legend doesn't collide with the sheet.
  - **Demo Impact:** Fixes the most visible current problem.
  - **Risk:** MEDIUM

  - [x] 37.1 Enlarge projection and tier label scale/prominence in mapLayout + TransitMap
    - _Requirements: 38.1, 38.2_
  - [x] 37.2 Preserve/clarify selected-route, disruption and Pulse emphasis and reposition legend
    - _Requirements: 38.3, 38.4, 38.5, 43.2_

- [x] 38. Home information architecture
  - **Objective:** Reorder Home into a clear hierarchy with capped lists and visible bus/feeder.
  - **Implementation:** Search hero → saved/recent (cap 3 + View all) → nearby transport (status + BusArrivalCard) → service status rows → Pulse snapshot (top 3 + link). Widen the desktop left panel.
  - **Dependency:** Tasks 36, 37
  - **Done When:** Search clearly leads; buses are a legitimate section; Home reads top-to-bottom in importance at both widths.
  - **Risk:** MEDIUM

  - [x] 38.1 Reorder HomeScreen and cap saved/recent with View all
    - _Requirements: 39.1, 39.2_
  - [x] 38.2 Build the nearby-transport section with BusArrivalCard and compress service status + Pulse snapshot
    - _Requirements: 39.3, 39.4, 40.3_

- [x] 39. Route options + recovery hero
  - **Objective:** Make options comfortable and the recovery recommendation unmistakably dominant.
  - **Implementation:** Redesign RouteHero (StatCluster + TransportModeSequence), RouteOptionRow, ProfileChips (larger, mobile scroll), the recovery header band, and surface a bus option alongside rail. JourneyScreen spacing.
  - **Dependency:** Tasks 36, 37
  - **Done When:** The hero dominates; preferences re-rank visibly and scroll on mobile; a valid bus option sits beside rail; modes are instantly recognisable.
  - **Demo Impact:** GER4K's hero moment.
  - **Risk:** MEDIUM

  - [x] 39.1 Redesign RouteHero with StatCluster + TransportModeSequence and the recovery header band
    - _Requirements: 41.1, 41.2, 40.1, 40.2_
  - [x] 39.2 Redesign RouteOptionRow + ProfileChips (comfortable, mobile-scrollable) and surface bus options alongside rail
    - _Requirements: 41.3, 41.4, 40.4_
  - [x] 39.3 Apply JourneyScreen spacing/hierarchy polish at both widths
    - _Requirements: 37.2, 43.1, 43.2_

- [x] 40. Pulse, Service, Profile polish
  - **Objective:** Clean, scannable Pulse / station drawer / Service / Profile, keeping all logic.
  - **Implementation:** Tidy StationPulseCard spacing, reorder StationSheet (action before paragraphs), redesign ServiceStatusRow usage and line detail layering, make PointsCard motivating-but-secondary, comfortable mobility switches.
  - **Dependency:** Task 36
  - **Done When:** Each screen reads cleanly at 390px and 1280px without information overload.
  - **Risk:** LOW

  - [x] 40.1 Polish PulseScreen + station cards and reorder StationSheet
    - _Requirements: 42.1, 42.2_
  - [x] 40.2 Polish Service list/detail and Profile points/mobility
    - _Requirements: 42.3, 42.4_

- [x] 41. Redesign verification
  - **Objective:** Confirm nothing regressed and the success criteria are met.
  - **Implementation:** Keep Ask GER4K readable (text only). Run `vitest run`, `tsc`, `npm run build`. Review at ~390px and ~1280px against the 20 success criteria; check no horizontal overflow, 44px targets, reduced-motion.
  - **Dependency:** Tasks 37–40
  - **Done When:** 63 tests pass, build/tsc clean, and the redesign reads like a real KL mobility product at both widths.
  - **Risk:** MEDIUM

  - [x] 41.1 Readability pass on AskGer4kSheet (no rework) and full verification
    - _Requirements: 43.3, 43.4, 37.3_

- [ ] 42. CHECKPOINT H — REDESIGN APPROVED
  - Passed only when the redesign is visually approved and all tests/build pass. Do NOT start Gerak Khas before this checkpoint.

# Target Full-Vision Demo

1. Open GER4K → mobility-style Home. 2. See saved/recent journeys. 3–4. Search
Putrajaya Sentral → KLCC. 5–6. Compare ETA, fare, transfers, walking, crowding,
confidence. 7. See the route on the map. 8. Presenter triggers the TRX–Conlay
disruption. 9. Affected segment shows on the map. 10. "Your journey has
changed". 11. GER4K recommends the best recovery. 12. Compare rail reroute,
least-walking, crowd-avoiding, replacement-bus and ride-hail fallback. 13–14.
Switch all seven profiles and see re-ranking. 15–16. Pulse on the map; open TRX
(Packed, reports, freshness, confidence, trend). 17–18. Report a condition,
receive +5 GER4K Points. 19. View line status. 20. See historical demand. 21. Ask
GER4K: why this route, avoid TRX, cheapest, bus option, less walking. 22. Save
the journey. 23. See the proactive alert. 24. Reset the scenario.

# Critical Path

1.1 → 1.2 → 1.5 → 1.6 → 1.7 → 2.1 → 2.2 → 2.3 → 3.1 → 3.3 → 3.4 [Checkpoint A] → 5.1 → 5.2 → 5.4 → 5.5 [Checkpoint B] → 7.1 → 7.2 → 8.1 → 8.3 [Checkpoint C] → 10.1 → 10.2 → 10.3 → 10.4 → 11.1 → 11.3 [Checkpoint D] → 13.1 → 13.2 → 13.3. Everything else is improvement on top.

# Cut Order If We Fall Behind

1. Saved journeys (14.3)
2. Persistent trust points
3. Trust-points UI beyond a simple animation (14.2)
4. Station Pulse submission (11.4 / 14.1)
5. Extra microanimations
6. Bedrock live integration — keep the deterministic Ask GER4K fallback (13.1 live calls)
7. Optional Profile screen
8. Secondary decorative elements

Never cut: normal journey, simulated disruption, affected-journey detection, recovery generation, alternative comparison, ranking, confidence/source transparency, core Station Pulse view, polished hero recovery screen.

# Do Not Build Yet

> Full Vision update: "Unnecessary maps", "Proactive alerts" and saved
> journeys / trust points are now built as **local, simulated prototype
> features** (tasks 27, 32, 28.2). Their production forms remain out of scope.
> Everything else below still applies.

- Authentication
- Payments
- Real voucher redemption
- Production community verification
- Whole Klang Valley coverage
- Full/production GTFS parser
- `StaticGtfsProvider`
- Live rail/bus feed integration (`LiveTransportProvider`)
- GTFS Realtime as a demo dependency — Malaysia's official GTFS Realtime at https://developer.data.gov.my/realtime-api/gtfs-realtime.en is FUTURE/OPTIONAL only, never a demo dependency; the core demo works fully offline; explore only if the entire MVP finishes early; no critical-path task
- Social-media scraping
- Complex ML
- Separate backend server
- Microservices
- Redux unless necessary
- SWR / TanStack Query unless proven necessary
- Kubernetes
- Custom VPC
- Production analytics
- Operator / admin / authority dashboards
- Unnecessary maps
- Unnecessary infrastructure
- Proactive alerts
- Mature verification / reward persistence
- Additional data.gov.my datasets beyond those approved (note https://data.gov.my/data-catalogue is a DISCOVERY source only, not a runtime dependency)

# Definition of Demo Ready

1. Open GER4K.
2. Plan Putrajaya Sentral → KLCC.
3. Show the normal journey.
4. Trigger the simulated TRX–Conlay disruption via Presenter Control.
5. Show affected detection.
6. Show the affected segment.
7. Show the recommended recovery.
8. Compare ≥2 valid alternatives.
9. Switch preference and visibly re-rank.
10. Explain confidence / source transparency.
11. Show Station Pulse at relevant interchanges.
12. Ask GER4K why an option is recommended.
13. Receive a structured explanation.
14. Reset the demo successfully.

# Demo-Readiness Checklist

- ☐ App opens cleanly with no placeholder or default Next styling
- ☐ Normal journey Putrajaya Sentral → KLCC plans and renders
- ☐ Presenter Control activates the simulated TRX–Conlay disruption
- ☐ Journey is marked affected with the correct legs highlighted
- ☐ "SIMULATED DEMO SCENARIO" indication is visible and independent of source status
- ☐ Recovery hero recommendation appears
- ☐ At least two valid alternatives (A via Pasar Seni, B via Masjid Jamek) compare
- ☐ Preference chips visibly re-rank the same alternatives
- ☐ Confidence band and source/status transparency are visible
- ☐ Station Pulse shows aggregated conditions at relevant interchanges
- ☐ Ask GER4K returns a structured explanation (AI or deterministic fallback)
- ☐ Demo resets cleanly to a fresh state
- ☐ Works at ~390px mobile and ~1280px laptop/projector
- ☐ No exposed AI/AWS credentials on the client

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each leaf task references specific requirements for traceability
- Checkpoints ensure incremental validation and keep the app runnable at each milestone
- Demo Polish (Task 15) depends on the completed core chain through Task 13, NOT on Task 14 supporting features
- Focused Testing (Task 16) runs before Checkpoint E so the winning demo is verified before deployment

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4", "3.1", "3.3"] },
    { "id": 5, "tasks": ["3.2", "3.4", "5.1", "5.2", "5.4"] },
    { "id": 6, "tasks": ["5.3", "5.5", "7.1"] },
    { "id": 7, "tasks": ["7.2", "8.1", "8.3"] },
    { "id": 8, "tasks": ["7.3", "8.2", "8.4", "10.1", "10.2", "10.3"] },
    { "id": 9, "tasks": ["10.4", "11.1"] },
    { "id": 10, "tasks": ["11.2", "11.3", "13.1"] },
    { "id": 11, "tasks": ["11.4", "13.2"] },
    { "id": 12, "tasks": ["11.5", "13.3", "14.1", "14.2", "14.3", "14.4", "14.5"] },
    { "id": 13, "tasks": ["13.4", "15.1"] },
    { "id": 14, "tasks": ["16.1", "16.2"] },
    { "id": 15, "tasks": ["18.1"] },
    { "id": 16, "tasks": ["19.1"] },
    { "id": 17, "tasks": ["19.2", "19.3"] },
    { "id": 18, "tasks": ["19.4"] },
    { "id": 19, "tasks": ["20.1", "23.1", "23.2", "23.3", "23.4", "23.5"] },
    { "id": 20, "tasks": ["20.2", "21.1", "21.2", "23.6"] },
    { "id": 21, "tasks": ["21.3", "22.1"] },
    { "id": 22, "tasks": ["22.2", "22.3"] },
    { "id": 23, "tasks": ["22.4", "24.1"] },
    { "id": 24, "tasks": ["24.2", "24.3"] },
    { "id": 25, "tasks": ["26.1", "26.2", "26.3"] },
    { "id": 26, "tasks": ["27.1"] },
    { "id": 27, "tasks": ["28.1", "28.2"] },
    { "id": 28, "tasks": ["29.1", "29.2"] },
    { "id": 29, "tasks": ["29.3", "29.4", "33.1"] },
    { "id": 30, "tasks": ["30.1", "30.2", "30.3"] },
    { "id": 31, "tasks": ["31.1", "32.1"] },
    { "id": 32, "tasks": ["34.1", "34.2"] }
  ]
}
```
