# Project Structure — GER4K

A single Next.js 15 (App Router, TypeScript) project. The guiding rule: **UI
components stay presentational; transport intelligence and recovery logic live
in reusable, framework-independent modules.**

> **Build incrementally.** The layout below is the **intended architecture**,
> not scaffolding to generate up front. Create folders and files **as features
> require them**. Do not generate empty directories or placeholder files just to
> match this diagram.

## Separation of concerns

- **Pages/routes** render and orchestrate; they call domain logic, they don't
  implement it.
- **UI components** are presentational and reusable. No complex business logic.
- **Domain logic** (transport model, routing, recovery, ranking, confidence) is
  pure and testable, with no React or Next.js imports.
- **Data providers** abstract live / scheduled / mocked sources behind one
  interface.
- **Services** wrap external integrations (AI, persistence, APIs).
- **Types/models** are shared and carry source/status tags everywhere.

## Intended layout (create as needed)

```
GER4K/
├── .kiro/
│   └── steering/                # product.md, tech.md, structure.md
├── public/                      # static assets (icons, images)
└── src/
    ├── app/                     # Next.js App Router
    │   ├── (routes)/            # pages: plan, recover, journey, station-pulse
    │   ├── api/                 # thin API/route handlers
    │   └── layout.tsx
    ├── components/              # reusable presentational UI
    │   ├── ui/                  # buttons, cards, badges, etc.
    │   ├── journey/             # journey/plan display components
    │   ├── disruption/          # disruption + confidence/status visuals
    │   └── station-pulse/       # community reporting UI
    ├── domain/                  # core intelligence (pure, framework-agnostic)
    │   ├── transport/           # network model, GTFS handling, multimodal plan
    │   ├── recovery/            # alternative generation + ranking logic
    │   ├── confidence/          # journey confidence + report verification
    │   └── community/           # Station Pulse logic + reward/reputation rules
    ├── data/                    # data providers (one interface per source type)
    │   ├── providers/           # live / scheduled / community providers
    │   └── mock/                # mocked/simulated scenarios (clearly labelled)
    ├── services/                # external integrations
    │   ├── ai/                  # AI assistant (Bedrock; explains/personalizes only)
    │   └── storage/             # optional persistence (e.g. DynamoDB) if needed
    ├── types/                   # shared TypeScript models + status enums
    ├── lib/ (utils/)            # small utilities/helpers
    ├── config/                  # app config, env access, constants
    └── __tests__/               # tests (focus on domain logic)
```

## Key rules

- **No business logic in components.** If a component computes routing, ranking,
  or confidence, move that into `src/domain/`.
- **Domain is reusable and UI-free.** `src/domain/` must not import React/Next.
  It can be unit-tested on its own.
- **Data access goes through `src/data/providers/`.** Domain code depends on the
  provider interface, never on whether data is live, scheduled, or mocked.
- **Mock data lives in `src/data/mock/`** and is clearly labelled as simulated.
- **AI stays in `src/services/ai/`** behind a provider interface as the
  explanation/personalization layer. It consumes domain results; it does not
  produce the core recommendations, and the app must work if AI is unavailable.
- **Status/source tagging is shared via `src/types/`** (LIVE, SCHEDULED,
  OPERATOR_CONFIRMED, COMMUNITY_REPORTED, UNVERIFIED) and flows through every
  layer.
- **Station Pulse / community** logic lives in `src/domain/community/` with its
  UI in `src/components/station-pulse/`.

## Conventions

- TypeScript throughout; prefer explicit, shared types from `src/types/`.
- Keep folder names by feature/concern; group related files together.
- Favour small, reusable components over large page-specific ones.
- Keep env/config access centralized in `src/config/`.
- Add directories only when a feature needs them (build incrementally).
