# Product — GER4K

GER4K is an AI-powered Malaysian public transport companion focused on
**personalized disruption recovery** for Klang Valley commuters. Built by team
**4WARD.AI** for HACKSPIRE LUMINA, domain: Intelligent Transit & Urban Mobility.

## Core principle

**Normal day: help me plan. Bad day: help me recover.**

## Value proposition

**GER4K turns disruption information into a personalized recovery plan.**

## The problem

During public transport disruptions, Klang Valley commuters often have to piece
together operator announcements, journey-planning apps, live transport info, and
informal community updates before deciding what to do next. GER4K turns this
fragmented information into clear, personalized, and actionable recovery
guidance.

GER4K is **not** a clone of journey planners or operator apps. Those already
show routes, schedules, fares, arrivals, and service info. GER4K's
differentiation is what happens **when a planned journey is disrupted**.

## Target users

Primary (the MVP is passenger-facing):

- Klang Valley public transport passengers
- Especially MRT, LRT, bus, and feeder-bus commuters
- Daily commuters and passengers making time-sensitive journeys

Secondary beneficiaries (not the MVP focus): transport operators, station teams,
transport authorities.

## Core user experience

1. On a normal day, GER4K helps the user plan a multimodal journey.
2. GER4K detects whether a disruption affects the user's planned/saved journey.
3. On a bad day, GER4K generates and ranks alternative recovery options and
   explains them.
4. The AI assistant lets the user ask contextual questions and personalizes the
   recommendation.

## Product vision — full feature list

> The feature list below is the **broader GER4K product vision**, not a
> mandatory hackathon checklist. See "Hackathon MVP scope" for what must ship
> for the demo. Do not treat every item here as required for the hackathon.

1. Basic everyday multimodal journey planning
2. Saved / common journeys
3. Detection of whether a disruption affects the user's journey
4. Alternative journey generation during disruptions
5. Ranking of recovery options using factors such as estimated travel time,
   number of transfers, walking distance, reliability/confidence, live-data
   availability, and passenger preferences
6. Clear distinction between information types: **LIVE**, **SCHEDULED**,
   **OPERATOR CONFIRMED**, **COMMUNITY REPORTED**, **UNVERIFIED**
7. A **Journey Confidence** / reliability indicator
8. **Station Pulse** — structured community reporting of conditions (crowding,
   delays, stopped trains, replacement transport)
9. Verification / confidence logic for community reports
10. An AI conversational assistant that explains recommendations and answers
    contextual questions (e.g. "Which option has less walking?", "I need to
    arrive before 9 AM", "Is there a feeder bus nearby?", "Why this route?")
11. A lightweight community reward system (points/reputation for useful verified
    reports)
12. Proactive alerts for saved journeys when relevant disruptions occur

## Hackathon MVP scope

**Core capabilities (must ship for the demo):**

- Normal journey display
- Simulated disruption
- Detection that the journey is affected
- Alternative recovery routes
- Comparison / ranking with confidence and source labels
- Station Pulse
- Basic AI explanation

**Secondary (implement only if time permits):**

- Saved journeys
- Proactive alerts
- Sophisticated community verification
- Reward / reputation persistence

## What differentiates GER4K

- Focus on **recovery**, not just planning.
- Fuses structured transport data, disruption context, routing logic,
  confidence scoring, and community information into one actionable plan.
- Honest about uncertainty — every piece of info carries a clear source/status.
- The AI chatbot is the **interface that explains and personalizes**, not the
  whole product. Core intelligence comes from data and logic.

## Future scope (not MVP)

- Operator / station-team / authority-facing tooling.
- Full live-feed integration across all operators.
- Mature reputation/anti-abuse systems for community rewards.
- Large-scale personalization and historical analytics.

## Product & design principles

- **Normal day: plan. Bad day: recover.** Keep scope on disruption recovery.
- Communicate uncertainty honestly; never present scheduled info as live.
- Strong visual hierarchy for important disruption information.
- Mobile-first, clean, modern, transport-oriented, easy to scan quickly —
  slightly futuristic but professional, not a generic admin dashboard.
- Animations only when they improve the experience without hurting usability or
  dev speed.

## Explicit non-goals

- Do not clone journey planners or operator apps.
- Do not make the chatbot the entire product.
- Do not build features outside the disruption-recovery problem.
- Do not make unsupported claims about transport data availability.
- Do not target operators/authorities as the primary MVP audience.
