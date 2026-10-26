# GER4K — Full Project Handoff / Context File

> **Purpose:** This file is a tool-agnostic handoff for anyone continuing GER4K in Kiro, Cursor, Claude Code, Windsurf, Copilot, Replit, VS Code agents, or another coding environment.  
> **Do not restart the project from scratch.** The working GER4K core already exists. Inspect and preserve the existing code before making changes.

---

## 1. Project Identity

- **Project name:** GER4K
- **Team name:** 4WARD.AI
- **Hackathon:** HACKSPIRE LUMINA
- **Domain:** Intelligent Transit & Urban Mobility
- **Primary market / context:** Klang Valley, Malaysia
- **Core principle:**  
  **Normal day: help me plan. Bad day: help me recover.**
- **Core value proposition:**  
  **GER4K turns public-transport disruptions into clear, personalized next steps.**
- **Product positioning:**  
  A passenger-facing mobility companion that combines journey planning, disruption recovery, official transport information, community conditions, confidence, and contextual AI.

GER4K should **not** feel like:
- another generic route planner,
- “transport + ChatGPT,”
- a developer/admin dashboard,
- a generic AI SaaS interface.

The differentiating question is:

> **“My usual journey is disrupted. What should I do now?”**

---

# 2. Problem We Are Solving

During MRT/LRT disruptions, Klang Valley commuters often have to piece together:

- official operator alerts,
- journey-planning apps,
- social media,
- WhatsApp/Telegram messages,
- station staff,
- community posts,
- personal guesses,

before deciding whether to:

- wait,
- reroute,
- change lines,
- use a feeder/bus,
- walk,
- take ride-hailing,
- or abandon the journey.

The real problem is **not a lack of information**.

It is:

> **fragmented information + difficult decision-making during disruption.**

GER4K acts as a calm decision layer above the transport network.

---

# 3. Product Strategy

GER4K has two major operating states.

## Normal Journey Mode

Useful even when there is no disruption.

Core ideas:
- origin/destination planning,
- route options,
- travel time,
- transfers,
- walking,
- source transparency,
- future fare/cost,
- future saved journeys,
- future service context,
- future multimodal routes.

## Disruption Recovery Mode — Hero Experience

When the user's planned journey is affected:

1. Detect that the journey is affected.
2. Mark the affected segment.
3. Generate valid recovery alternatives.
4. Rank alternatives.
5. Show a clear GER4K recommendation.
6. Explain trade-offs.
7. Incorporate Station Pulse conditions.
8. Let the user change preference.
9. Allow contextual Ask GER4K explanations.

This recovery experience is the main differentiator.

---

# 4. Current Working Core

The project has already been implemented as a working local prototype.

The required core build is substantially complete.

Current status:
- Core app builds locally.
- Required disruption-recovery flow was implemented.
- `MockDataProvider` is the runtime provider.
- Normal journey works.
- Presenter disruption scenario works.
- Recovery routes work.
- Ranking/confidence logic works.
- Station Pulse core works.
- Ask GER4K has a deterministic fallback.
- AWS Amplify deployment files/documentation exist.
- Live Amplify deployment is **not yet completed** because it requires the user's AWS account.
- Optional/starred tasks may not all be implemented yet.
- A later **Full Vision Expansion** has been designed but may not yet be implemented.

Before changing anything:
1. inspect the existing repository,
2. read existing requirements/design/tasks files if available,
3. run the app,
4. preserve working domain logic.

---

# 5. Existing Technical Stack

The approved implementation uses:

- **Next.js 15.x**
- **TypeScript**
- **App Router**
- **Tailwind CSS**
- optional small use of **shadcn/ui**
- built-in React/Next state
- plain `fetch`
- no Redux unless genuinely required
- no SWR/TanStack Query unless genuinely required
- thin Next.js API routes
- `MockDataProvider` as the only MVP runtime provider
- framework-free domain logic
- **Amazon Bedrock** for optional AI explanations
- deterministic AI fallback
- **AWS Amplify Hosting**
- **Vitest** for focused tests

The domain core should not depend on React, Next.js, or AI.

---

# 6. Architecture Principle

The intended architecture is roughly:

```text
UI / React
    ↓
Domain logic
    ↓
DataProvider interface
    ↓
MockDataProvider (current runtime)
```

AI is separate:

```text
UI
 ↓
/api/ask
 ↓
AI Provider / Bedrock
 ↓
structured explanation

Fallback:
deterministic explanation from domain results
```

AI **must not** calculate routes or rankings.

---

# 7. Important Domain Components

Existing/planned domain modules include:

- `Journey_Planner`
- `Disruption_Monitor`
- `Recovery_Engine`
- `Ranking_Engine`
- `Confidence_Indicator`
- `Pulse_Aggregator`

The important rule:

> UI renders decisions. Domain logic makes decisions.

Do not move transport/ranking/recovery logic into React components.

---

# 8. Data Provider Strategy

The current runtime uses:

## `MockDataProvider`

“Mock” means:

> predictable local data for a reliable hackathon demo.

It does **not** mean all underlying transport information should be invented.

Preferred development flow:

```text
Official data
→ development-time inspection/extraction
→ small local GER4K fixture
→ MockDataProvider
→ GER4K
```

This protects the live demo from external API failures.

---

# 9. Official Data Sources

Use official Malaysian data where practical.

## GTFS Static

Malaysia official API:

https://developer.data.gov.my/realtime-api/gtfs-static

Primary use:
- real stations,
- rail lines,
- stop relationships,
- schedules,
- development-time network verification.

For the prototype, use the relevant Rapid Rail / Klang Valley static data where practical.

Do **not** make the live demo depend on the endpoint.

---

## GTFS Realtime

https://developer.data.gov.my/realtime-api/gtfs-realtime.en

Use only where supported and useful.

Potential use:
- buses,
- MRT feeder vehicle positions,
- future live mobility enhancement.

Important:
- do not assume stable Rapid Rail live train data,
- do not make realtime a single point of failure,
- simulated realtime is acceptable if clearly labelled.

---

## Daily Rapid Rail Origin-Destination Ridership

https://data.gov.my/data-catalogue/ridership_od_rapidrail_daily

Potential use:
- historical passenger demand,
- Historical Demand Index,
- disruption-impact context,
- important OD/station analysis.

Never present this dataset as live crowding.

Label it:

> **HISTORICAL**

---

## General Malaysian Data Catalogue

https://data.gov.my/data-catalogue

Use for discovering useful official datasets.

It is not itself an app runtime dependency.

---

# 10. Information Honesty Model

The application distinguishes **source status** from **simulation status**.

Possible source statuses:

- `LIVE`
- `SCHEDULED`
- `OPERATOR_CONFIRMED`
- `COMMUNITY_REPORTED`
- `UNVERIFIED`

Full Vision may also add:

- `HISTORICAL`
- `ESTIMATED`

Separately:

```ts
isSimulated: boolean
```

These are independent.

Examples:

### Normal scheduled rail fixture

```text
sourceStatus = SCHEDULED
isSimulated = false
```

### Hackathon disruption scenario

```text
sourceStatus = UNVERIFIED
isSimulated = true
```

### Seeded demo Station Pulse condition

```text
sourceStatus = COMMUNITY_REPORTED
isSimulated = true
```

### Real report submitted by the current prototype user

```text
sourceStatus = UNVERIFIED
isSimulated = false
```

Do not imply seeded demo conditions were reported by real passengers.

---

# 11. Locked Demo Journey

The main demonstration journey is:

> **Putrajaya Sentral → KLCC**

## Normal Baseline

Conceptually:

```text
Putrajaya Sentral
↓ MRT Putrajaya Line
Ampang Park
↓ interchange
LRT Kelana Jaya Line
KLCC
```

Current demo UI may show approximately:
- 28 min,
- 1 transfer,
- 180 m walking.

Any value not verified from an official source must be treated as a demo fixture estimate.

---

# 12. Simulated Disruption

The core demo disruption is:

> **Putrajaya Line segment TRX → Conlay**

Rules:

```text
isSimulated = true
sourceStatus = UNVERIFIED
severity = Severe disruption
```

The UI must clearly communicate:

> **SIMULATED DEMO SCENARIO**

but this should be secondary to the user's recovery action.

Never label the simulated incident as operator-confirmed.

---

# 13. Recovery Alternatives

## Alternative A — via TRX / Pasar Seni

```text
Putrajaya Sentral
→ MRT Putrajaya Line
→ TRX
→ MRT Kajang Line
→ Pasar Seni
→ LRT Kelana Jaya Line
→ KLCC
```

Typical demo values:

- ~34 min
- 2 transfers
- ~520 m walking

Designed to be attractive for:
- Fastest,
- Balanced.

---

## Alternative B — via Chan Sow Lin / Masjid Jamek

```text
Putrajaya Sentral
→ MRT Putrajaya Line
→ Chan Sow Lin
→ Ampang/Sri Petaling Line
→ Masjid Jamek
→ LRT Kelana Jaya Line
→ KLCC
```

Typical demo values:

- ~41 min
- 2 transfers
- ~260 m walking

Designed to be attractive for:
- Least Walking.

Both alternatives must avoid the disrupted TRX–Conlay segment.

---

# 14. Deterministic Ranking

Existing profiles:

- Balanced
- Fastest
- Least Walking
- Fewest Transfers

The approved ranking formula uses normalized:

- travel time,
- transfers,
- walking distance.

Weighted cost:

```text
cost =
wTime * normalizedTime
+ wTransfers * normalizedTransfers
+ wWalk * normalizedWalk
```

Weights:

| Profile | Time | Transfers | Walking |
|---|---:|---:|---:|
| Balanced | 1.0 | 1.0 | 1.0 |
| Fastest | 3.0 | 0.5 | 0.5 |
| Least Walking | 0.5 | 0.5 | 3.0 |
| Fewest Transfers | 0.5 | 3.0 | 0.5 |

Lower cost ranks higher.

Tie-break:
1. shortest travel time,
2. stable journey ID.

No ML is needed for this.

---

# 15. Full Vision Ranking Expansion

Planned profiles:

- Cheapest
- Avoid Crowding
- Accessible / Easier Journey

These should extend the deterministic engine.

Possible user mappings:

```text
"I'm on a budget"
→ Cheapest

"I'm travelling with my grandmother"
→ Accessible / Less Walking

"I don't want packed stations"
→ Avoid Crowding
```

AI may map natural language to a supported preference.

AI still does not calculate the route.

---

# 16. Journey Confidence

GER4K confidence is:

> an explainable product confidence indicator,

not:

> a scientifically validated probability of arrival.

Existing score concept:

- base score: 60
- additive factors
- clamp 0–100

Example factors:
- trusted/live/operator source: positive
- scheduled data: small positive
- unverified data: negative
- additional transfers: negative
- recent Station Pulse: positive/contextual
- packed/severe conditions: negative
- simulation/mixed uncertainty: negative

Bands:

- High: 75+
- Medium: 50–74
- Low: under 50

For passenger UI:
show primarily:

> **Medium confidence**

not raw formula details.

The numeric score and technical factors may be behind “Why?”

---

# 17. Station Pulse

Station Pulse is a structured community intelligence layer.

Purpose:

> summarize current station conditions rather than showing a raw social feed.

Current demo seeds include:

- TRX → Packed
- Chan Sow Lin → Busy
- optional Pasar Seni condition

Seeded demo reports are simulated.

Current aggregation logic:

1. keep reports from the last 30 minutes,
2. map severity:
   - Normal = 0
   - Busy = 1
   - Packed = 2
   - Severe disruption = 3
3. reports in the last 10 minutes count double,
4. choose the condition with highest weighted support,
5. ties choose the more severe condition.

Pulse confidence:

- High: most recent ≤10 min and at least 3 reports
- Medium: most recent ≤30 min and at least 1 report
- Low: otherwise

The UI should lead with:

```text
TRX
PACKED

12 recent reports
Updated 2 min ago
High confidence
```

not a list of raw report cards.

---

# 18. Community Reporting

Full Vision should allow structured reports such as:

- Normal
- Busy
- Packed
- Cannot board
- Delay
- Train moving slowly
- Train stopped
- Replacement bus available
- Entrance closed
- Lift/escalator issue

New prototype user report:

```text
sourceStatus = UNVERIFIED
isSimulated = false
```

Do not automatically claim verification.

---

# 19. GER4K Points

Planned lightweight gamification:

```text
Report submitted
+5 GER4K Points
```

Possible contributor labels:

- New Contributor
- Reliable Contributor
- Community Helper

Do not build:
- real voucher redemption,
- commercial partner claims,
- real financial rewards,
- complex economy.

Rewards may be future roadmap.

---

# 20. Ask GER4K

Ask GER4K is:

> contextual mobility intelligence,

not:

> a blank chatbot.

Good questions:

- Why this route?
- Which option is cheapest?
- Which has less walking?
- Can I avoid TRX?
- Which route avoids packed stations?
- Is there a bus alternative?
- What is happening at TRX?
- Why is confidence Medium?
- Is this information live or historical?
- I'm travelling with my grandmother.

Good response style:

```text
The Pasar Seni route is currently your fastest recovery.

34 min
2 changes
520 m walking

TRX is crowded, but this route still gets you to KLCC around
7 minutes sooner than the Chan Sow Lin option.

[ Less walking ]
[ Avoid crowds ]
```

Avoid long algorithm explanations.

---

# 21. Current UI Problem

The current generated UI was considered **functionally correct but visually poor**.

Main issues:
- looked like a developer/admin dashboard,
- dark navy/purple/cyan generic AI aesthetic,
- tiny typography,
- too many pills/badges,
- cards inside cards,
- large unused desktop space,
- weak transport identity,
- Ask GER4K looked like a technical explanation modal,
- Station Pulse looked like debug/admin data,
- recovery hero did not feel like a winning consumer product.

Do not preserve the current frontend layout just because it exists.

Preserve business logic, not bad presentation.

---

# 22. New UX Direction

The desired mental model is closer to modern mobility apps such as:

- Moovit
- Citymapper
- Transit
- Google Maps Transit
- MyRapid PULSE

Do not clone any of them.

Borrow useful principles:

## Moovit
- search-first planning,
- origin/destination mental model,
- map + route panel,
- suggested routes,
- Lines / Alerts.

## Citymapper
- clear route strategy comparison,
- fastest/cheapest/easiest,
- multimodal alternatives.

## Transit
- large arrival/status information,
- useful live information front and center.

## Google Maps
- map hierarchy,
- one selected route,
- quieter alternatives,
- mobile bottom sheets,
- saved/recent places.

## MyRapid
- local line/status familiarity.

GER4K adds:
- disruption recovery,
- Station Pulse,
- confidence,
- crowd-aware reranking,
- community intelligence,
- contextual AI,
- historical demand,
- proactive recovery.

---

# 23. Desired Information Architecture

Potential primary navigation:

- Home
- Pulse
- Service
- Saved / Profile

No AI tab.

Presenter Control remains hidden/separate.

---

# 24. Home Vision

Home should immediately support real mobility behavior.

Important elements:

- large “Where are you going?” search,
- origin/destination,
- departure time,
- recent destinations,
- saved journeys,
- relevant service status,
- nearby/relevant transport,
- proactive saved-journey alert.

Example:

```text
GER4K

Where are you going?

From
Putrajaya Sentral

To
KLCC

[ Find routes ]

Saved journeys
Home → Work
Putrajaya Sentral → KLCC

Relevant services
Putrajaya Line — Normal
Feeder Txxx — 6 min
```

---

# 25. Map / Schematic

A route map/schematic is now considered important.

It does not need to be a production Google Maps integration.

Acceptable:
- stylized transit schematic,
- simplified network map,
- lightweight geographic view.

Desktop direction:

```text
LEFT 35–40%
Journey/search/routes

RIGHT 60–65%
Map/schematic
```

Mobile direction:

```text
MAP
↓
BOTTOM SHEET
journey / recovery / alternatives
```

Selected alternatives should update the map.

Disruption should be spatially obvious.

Station Pulse conditions can appear on the map.

---

# 26. Full Vision Multimodal Features

Planned prototype capabilities:

- MRT
- LRT
- Rapid KL bus
- MRT feeder bus
- walking
- interchange walking
- mixed rail + bus
- optional ride-hailing fallback

Do not model the whole Klang Valley.

Only build enough local fixture coverage to make the product believable.

---

# 27. Fare / Cost

Full Vision should include:

- estimated fare,
- total journey cost,
- route cost comparison.

If not verified:

> **DEMO FARE ESTIMATE**

Example route comparison:

```text
Recommended
28 min · RM4.20
1 change · 180 m walk

Less walking
33 min · RM4.50

Cheapest
35 min · RM3.70
```

---

# 28. Full Recovery Comparison

During disruption, GER4K should be able to compare strategies such as:

### Best overall
Rail reroute via Pasar Seni

### Least walking
Via Chan Sow Lin / Masjid Jamek

### Avoid crowding
Route avoiding packed TRX

### Bus-supported recovery
Rail + feeder / bus

### Ride-hailing fallback
Demo estimated price/time

Compare:
- ETA
- cost
- transfers
- walking
- crowding
- confidence
- source transparency.

Only show meaningful options.

---

# 29. Service / Lines

A future Service section should show:

```text
Putrajaya Line
Normal

Kajang Line
Normal

Kelana Jaya Line
Normal

Sri Petaling Line
Modified service
```

A line detail can combine:

1. official information,
2. community conditions,
3. GER4K decision support.

Example:

```text
OFFICIAL
Putrajaya Line disruption

COMMUNITY
TRX currently packed

GER4K
Your journey is affected.
Best recovery: via Pasar Seni.
```

---

# 30. Saved Journeys / Proactive Alerts

Saved journeys should use local persistence.

Examples:
- Home → Work
- Home → University
- Putrajaya Sentral → KLCC

Prototype alert:

```text
Your usual journey may be disrupted

Putrajaya Sentral → KLCC

Service interruption between TRX and Conlay.

GER4K has prepared alternatives.

[ View recovery ]
```

No production push system is required.

---

# 31. Accessibility / Mobility Preferences

Prototype preferences:

- Less walking
- Fewer transfers
- Avoid stairs
- Wheelchair-friendly
- Travelling with elderly passenger

Do not fabricate station accessibility facts.

If data is unavailable:
- omit the claim,
- or clearly label the prototype/simulated value.

---

# 32. Production Features That Are NOT Required

Do not waste time on:

- production authentication,
- payments,
- real voucher redemption,
- production community moderation,
- whole Klang Valley coverage,
- full GTFS ingestion pipeline,
- microservices,
- Kubernetes,
- custom VPC,
- production analytics,
- enterprise operator dashboards.

The goal is:

> full PRODUCT prototype, not full production infrastructure.

---

# 33. AWS Deployment

Existing deployment work includes:

- `amplify.yml`
- `DEPLOY.md`
- secret handling
- no `NEXT_PUBLIC_` AWS/Bedrock secrets
- deterministic Ask GER4K fallback

Live deployment still requires the project owner to connect the repo in AWS Amplify.

Do not mark deployment complete unless the real hosted app has been verified.

---

# 34. Testing Philosophy

Use focused example-based Vitest.

Important tests:
- normal journey generation,
- disruption detection,
- alternatives avoid blocked segment,
- deterministic ranking,
- confidence band boundaries,
- Station Pulse aggregation,
- new user reports start UNVERIFIED,
- deterministic Ask GER4K fallback,
- one full happy-path smoke test.

Do not introduce heavy property-based testing unless there is a real reason.

---

# 35. Current Demo Story

The current reliable core demo is:

1. Open GER4K.
2. Plan Putrajaya Sentral → KLCC.
3. Show the normal journey.
4. Trigger simulated TRX–Conlay disruption.
5. Show affected detection.
6. Show the affected segment.
7. Show GER4K's recovery recommendation.
8. Compare at least two alternatives.
9. Change preference and re-rank.
10. Explain confidence/source transparency.
11. Show Station Pulse.
12. Ask GER4K why an option is recommended.
13. Receive a structured explanation.
14. Reset the demo.

---

# 36. Full Vision Demo Goal

The expanded product should eventually support:

1. open GER4K,
2. see saved/recent journeys,
3. search Putrajaya Sentral → KLCC,
4. compare time / fare / walking / transfers,
5. see route on map/schematic,
6. trigger disruption,
7. detect affected segment,
8. see rail recovery,
9. see low-walking option,
10. see crowd-avoidance option,
11. see bus/feeder option,
12. optionally compare ride-hailing,
13. re-rank by preference,
14. inspect Station Pulse,
15. submit report,
16. receive GER4K Points,
17. see Historical Demand,
18. ask GER4K,
19. save journey,
20. show proactive disruption alert,
21. reset.

---

# 37. Very Important Continuation Rules

If continuing this project in another coding agent:

## DO

- inspect the existing code first,
- run the app before rewriting anything,
- preserve working domain logic,
- preserve completed tests,
- preserve data honesty,
- preserve the demo scenario,
- extend existing interfaces rather than replacing them casually,
- keep AI contextual,
- keep decisions deterministic where already designed,
- improve the frontend aggressively if needed.

## DO NOT

- restart from a blank project,
- replace the architecture just because another stack is preferred,
- make AI responsible for routing,
- pretend simulated data is live,
- rebuild full Klang Valley coverage,
- overengineer production infrastructure,
- remove working core features to simplify implementation,
- preserve the current ugly dashboard UI just because it exists.

---

# 38. Recommended Next Step for Another Agent

First:

1. inspect repository structure,
2. read `package.json`,
3. locate existing GER4K spec/steering files,
4. run `npm install` if required,
5. run `npm run dev`,
6. test the current happy path,
7. identify which Full Vision features are already implemented,
8. identify which remain missing,
9. propose a targeted expansion plan,
10. do not rewrite completed functionality unnecessarily.

---

# 39. Suggested Initial Prompt for Another Coding Agent

Use something like:

```text
Read GER4K_Project_Handoff.md first.

This is an existing working project. Do not rebuild it from scratch.

Inspect the repository and current implementation before making changes.

Preserve working domain logic, routing, disruption detection, recovery, ranking,
confidence, Station Pulse, Ask GER4K fallback, fixtures, tests and deployment config.

First give me:

1. current architecture you found,
2. which GER4K capabilities already work,
3. which Full Vision capabilities from the handoff are missing,
4. which frontend components need redesign,
5. a minimal-risk implementation order.

Do not start rewriting the application until you understand the existing code.

The goal is to continue the current GER4K project, not recreate it.
```

---

# 40. One-Sentence Product Pitch

> **GER4K is an intelligent Klang Valley mobility companion that helps commuters plan normally and recover intelligently when public transport goes wrong.**

---

# 41. Short Hackathon Description

> GER4K combines official transport information, disruption intelligence, community-reported station conditions and explainable route ranking to help Klang Valley commuters decide what to do next when their usual public-transport journey is disrupted.

---

# 42. Final Product Design Principle

> **The more chaotic the transport network becomes, the calmer and more decisive GER4K should become.**

