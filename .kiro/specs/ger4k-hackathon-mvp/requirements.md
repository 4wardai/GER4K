# Requirements Document

## Introduction

GER4K is an AI-powered Malaysian public transport companion for Klang Valley
commuters, focused on **personalized disruption recovery**. Core principle:
*normal day, help me plan; bad day, help me recover.* On a normal day GER4K
helps a passenger plan a multimodal journey. When a disruption affects that
journey, GER4K detects the impact, generates and ranks alternative recovery
options, and explains them honestly with clear source/status labelling.

This document specifies the **hackathon MVP** scope for the HACKSPIRE LUMINA
demo. The guiding philosophy is that a **complete end-to-end demo beats feature
quantity**: the full flow (plan → simulated disruption → detection → ranked
recovery alternatives with confidence and source labels → Station Pulse) must
work without authentication, payments, production infrastructure, complex ML, or
additional external APIs.

Each requirement title carries an **MVP classification** — `[MUST HAVE]`,
`[SHOULD HAVE]`, `[NICE TO HAVE]`, or `[FUTURE / CUT]` — so scope is visible at a
glance.

## Scope Tiers (Full Vision Prototype update)

The MVP below is implemented and working. The spec now grows GER4K into an
**intelligent Klang Valley mobility companion** that helps passengers plan,
compare, understand, recover and adapt. Three tiers keep scope honest:

| Tier | Meaning | Requirements |
|---|---|---|
| **CORE / ALREADY WORKING** | Implemented MVP domain logic, tests and deployment. Preserved; extended only additively. | 1–11 (12 partially) |
| **FULL VISION PROTOTYPE** | New passenger-facing capabilities, built as a high-fidelity functional prototype on local fixtures, deterministic domain logic and localStorage. | 14–35 |
| **PRODUCTION / FUTURE** | Infrastructure the prototype does not need. | 13, 36 |

Guiding rule for the Full Vision tier: **real official data where practical,
development-time extraction into local fixtures, deterministic logic, and honest
labelling of anything simulated or estimated.** Live data enhances the product
but is never a critical dependency.

Requirement 13 (deferred capabilities) is partly superseded: proactive alerts
for saved journeys, saved journeys and contributor points now exist as
**local, simulated prototype features** (Requirements 25, 28, 29). Their
production forms (push infrastructure, reward economy, persistence) remain
FUTURE.

## Glossary

- **GER4K**: The overall public transport recovery companion system described by
  this document.
- **Journey_Planner**: The subsystem that builds multimodal journey plans from
  an origin, destination, and departure time.
- **Disruption_Monitor**: The subsystem that evaluates whether a disruption
  affects a given journey.
- **Recovery_Engine**: The subsystem that generates alternative recovery
  journeys when a journey is disrupted.
- **Ranking_Engine**: The subsystem that orders recovery alternatives using
  deterministic domain logic and a selected preference profile.
- **Confidence_Indicator**: The subsystem that computes and presents a journey
  confidence/reliability level.
- **Station_Pulse**: The community-reporting subsystem covering both submission
  of station-condition reports and aggregated viewing of station conditions.
- **Pulse_Aggregator**: The component that aggregates recent community reports
  for a station into a concise station-condition summary.
- **AI_Assistant**: The optional conversational layer that explains and
  personalizes domain results; it never calculates core recommendations.
- **Data_Provider**: The framework-free interface through which all transport
  and community data flows, abstracting live, scheduled, operator, and
  community/mocked sources.
- **Source_Status_Tag**: An information-source confidence label carried through
  the system. One of: `LIVE`, `SCHEDULED`, `OPERATOR_CONFIRMED`,
  `COMMUNITY_REPORTED`, `UNVERIFIED`, and (Full Vision) `HISTORICAL`,
  `ESTIMATED`.
- **Journey_Options_Engine** (Full Vision): The subsystem that enumerates
  multimodal candidate journeys, attaches comparison attributes, removes
  dominated candidates and tags meaningful strategies.
- **Fare_Engine** (Full Vision): The subsystem that computes a deterministic
  journey cost estimate and breakdown.
- **Transit_Map**: The lightweight schematic map that shows the selected route,
  alternatives, the disrupted segment and Pulse markers.
- **Station_Report_Type** (Full Vision): A structured community report type.
  One of: `Normal`, `Busy`, `Packed`, `Cannot board`, `Delay`,
  `Train moving slowly`, `Train stopped`, `Replacement bus available`,
  `Entrance closed`, `Lift/escalator issue`.
- **Historical_Demand**: An explainable station demand band (`HIGH`, `MEDIUM`,
  `LOW`) derived from official Rapid Rail origin-destination ridership, always
  labelled `HISTORICAL`.
- **Saved_Journey**: A locally stored origin/destination pair with a passenger
  label (e.g. "Work").
- **GER4K_Points**: Local contributor points awarded for structured reports.
- **Data_Mode**: A separate flag (`isSimulated`) indicating whether a record
  belongs to a simulated demo scenario rather than real data. Independent of
  `Source_Status_Tag`.
- **Preference_Profile**: A selectable ranking preference. One of: `Balanced`,
  `Fastest`, `Least Walking`, `Fewest Transfers`, and (Full Vision) `Cheapest`,
  `Avoid Crowding`, `Accessible`.
- **Station_Condition**: An aggregated station-condition value from the
  predefined set: `Normal`, `Busy`, `Packed`, `Severe disruption`.
- **Demo_Scenario**: The predefined hackathon disruption scenario used to drive
  the simulated end-to-end demo.

## Data Classification Reference

GER4K separates two independent concepts so the UI never conflates them:

- **Information-source confidence** is expressed by `Source_Status_Tag`:
  - **LIVE**: real-time data from a live feed.
  - **SCHEDULED**: timetable/schedule data, not real-time.
  - **OPERATOR_CONFIRMED**: confirmed by a real transport operator.
  - **COMMUNITY_REPORTED**: submitted by community members.
  - **UNVERIFIED**: unconfirmed or low-confidence information.
- **Simulation status** is expressed separately by `Data_Mode` (`isSimulated`).
  A record is either part of a simulated demo scenario or not, **regardless of**
  its `Source_Status_Tag`.

Rules:

- A simulated record MUST carry `isSimulated = true` and MUST still carry a
  `Source_Status_Tag`.
- A simulated disruption MUST NOT be tagged `OPERATOR_CONFIRMED`, because no real
  transport operator confirmed it. A simulated disruption carries a
  non-operator-confirmed tag such as `UNVERIFIED` or `SCHEDULED` as the scenario
  dictates.
- Scheduled data MUST NOT be presented as live.

## Design Constraints (for Technical Design stage)

These are mandatory architecture constraints to be honoured during the Technical
Design stage. They are not user-facing functional requirements.

- **Data_Provider abstraction**: All transport and community data MUST flow
  through a framework-free `Data_Provider` interface so mocked/simulated sources
  can be swapped for real ones **without changing routing or recovery logic**.
  The `Data_Provider` interface MUST NOT import React or Next.js and MUST be
  independently testable. Mocked and real sources MUST both flow through the same
  `Source_Status_Tag` and `Data_Mode` tagging.

---

## Requirements

### Requirement 1: Journey Planning [MUST HAVE]

**User Story:** As a Klang Valley commuter, I want to plan a multimodal journey
from an origin to a destination, so that I know how to get there on a normal
day.

#### Acceptance Criteria

1. WHEN a user submits an origin, a destination, and a departure time, THE Journey_Planner SHALL produce a multimodal journey plan composed of one or more ordered journey legs.
2. THE Journey_Planner SHALL display, for each journey plan, the ordered legs, each leg's transport mode, and the estimated total travel time.
3. IF no journey plan can be produced for the submitted origin and destination, THEN THE Journey_Planner SHALL display a message stating that no route was found.
4. THE Journey_Planner SHALL obtain all transport data through the Data_Provider interface.

### Requirement 2: Source / Status Transparency [MUST HAVE]

**User Story:** As a commuter, I want to see where each piece of information
comes from and how reliable it is, so that I can trust the guidance and tell
live information from scheduled or community information.

#### Acceptance Criteria

1. THE GER4K SHALL carry a Source_Status_Tag on every transport and community record it displays.
2. THE GER4K SHALL make Source_Status_Tag information clearly visible at an appropriate granularity — per record, card, journey leg, alert, or report — rather than beside every individual text field.
3. WHEN a record, card, journey leg, alert, or report is displayed, THE GER4K SHALL present enough source/status information for the user to determine whether that information is live, scheduled, operator-confirmed, community-reported, or unverified.
4. IF information is `SCHEDULED`, THEN THE GER4K SHALL NOT present that information as `LIVE`.

### Requirement 3: Disruption Detection [MUST HAVE]

**User Story:** As a commuter, I want GER4K to tell me whether a disruption
affects my planned journey, so that I know when I need a recovery plan.

#### Acceptance Criteria

1. WHEN a disruption is present and a journey plan exists, THE Disruption_Monitor SHALL determine whether the disruption affects any leg of that journey plan.
2. IF a disruption affects at least one leg of the journey plan, THEN THE Disruption_Monitor SHALL mark the journey as affected and indicate which legs are affected.
3. IF a disruption is present but affects no leg of the journey plan, THEN THE Disruption_Monitor SHALL mark the journey as not affected.
4. THE Disruption_Monitor SHALL obtain disruption data through the Data_Provider interface.

### Requirement 4: Disruption Simulation [MUST HAVE]

**User Story:** As a hackathon presenter, I want to trigger a predefined
simulated disruption, so that I can demonstrate the recovery flow end-to-end
without a live disruption occurring.

#### Acceptance Criteria

1. WHEN the user activates the Demo_Scenario, THE GER4K SHALL introduce a predefined simulated disruption on a predefined part of the transport network.
2. THE GER4K SHALL set `isSimulated = true` on the simulated disruption and on records derived from the Demo_Scenario.
3. THE GER4K SHALL display a clear "SIMULATED DEMO SCENARIO" indication for simulated records, communicated independently of the Source_Status_Tag.
4. THE GER4K SHALL assign the simulated disruption a non-operator-confirmed Source_Status_Tag — `UNVERIFIED` or `SCHEDULED` as the Demo_Scenario dictates.
5. THE GER4K SHALL NOT tag any simulated disruption as `OPERATOR_CONFIRMED`.
6. WHEN the simulated disruption is active, THE Disruption_Monitor SHALL be able to detect that it affects the demo journey.

### Requirement 5: Recovery Route Generation [MUST HAVE]

**User Story:** As a commuter whose journey is disrupted, I want GER4K to
generate alternative ways to reach my destination, so that I can still get there.

#### Acceptance Criteria

1. WHEN a journey is marked as affected by a disruption, THE Recovery_Engine SHALL generate one or more alternative journeys that avoid the affected part of the network.
2. WHEN the Demo_Scenario disruption is active and the fixture network supports it, THE Recovery_Engine SHALL produce at least two valid alternative journeys so that comparison and ranking are meaningful.
3. WHERE only one valid alternative exists for a given disruption, THE Recovery_Engine SHALL return that single alternative.
4. IF no valid alternative journey can be generated, THEN THE Recovery_Engine SHALL display a message stating that no alternative route was found.
5. THE Recovery_Engine SHALL obtain all transport data through the Data_Provider interface.

### Requirement 6: Alternative Comparison and Ranking [MUST HAVE]

**User Story:** As a commuter choosing between recovery options, I want the
alternatives ranked by my preference with a clear confidence level, so that I
can pick the best option quickly.

#### Acceptance Criteria

1. THE Ranking_Engine SHALL rank the generated recovery alternatives using deterministic domain logic.
2. THE Ranking_Engine SHALL support the Preference_Profile set: `Balanced`, `Fastest`, `Least Walking`, `Fewest Transfers`.
3. WHEN the user changes the selected Preference_Profile, THE Ranking_Engine SHALL re-rank the same set of recovery alternatives using deterministic domain logic.
4. THE Confidence_Indicator SHALL present a confidence/reliability level for each ranked alternative.
5. THE GER4K SHALL display, for each ranked alternative, comparison attributes including estimated travel time, number of transfers, and walking amount.
6. THE Ranking_Engine SHALL compute rankings independently of the AI_Assistant.

### Requirement 7: Station Pulse Viewing and Aggregation [MUST HAVE]

**User Story:** As a commuter, I want to see an at-a-glance summary of current
conditions at a station, so that I can judge how bad things are without reading
every individual report.

#### Acceptance Criteria

1. WHEN a user views a relevant station, THE Pulse_Aggregator SHALL aggregate recent community reports for that station into a concise station-condition summary.
2. THE Pulse_Aggregator SHALL assign the summary an aggregated Station_Condition from the predefined set: `Normal`, `Busy`, `Packed`, `Severe disruption`.
3. THE Station_Pulse SHALL display, where available, the aggregated Station_Condition, the number of recent reports, the freshness or most-recent report time, and a confidence level.
4. THE Pulse_Aggregator SHALL compute the aggregated summary using deterministic logic without machine learning.
5. WHERE individual reports are shown, THE Station_Pulse SHALL display them below the aggregated summary.
6. THE Station_Pulse SHALL make source/status information visible at the report and summary level.

### Requirement 8: Mobile-First Responsive Interface [MUST HAVE]

**User Story:** As a commuter using my phone and as a judge viewing on a
projector or laptop, I want the core screens to look polished and work well on
both small and large viewports, so that the demo is clear in any setting.

#### Acceptance Criteria

1. THE GER4K SHALL present the core demo screens as usable and polished at a mobile viewport width of 390px.
2. THE GER4K SHALL present the core demo screens as usable and polished at a laptop/desktop viewport width of approximately 1280px.
3. THE GER4K SHALL make source/status information visible at record, card, journey leg, alert, or report granularity across both viewport widths.
4. THE GER4K SHALL display the "SIMULATED DEMO SCENARIO" indication for simulated records across both viewport widths.

### Requirement 9: Station Pulse Report Submission [SHOULD HAVE]

**User Story:** As a commuter at a station, I want to submit a short report about
current conditions, so that other commuters benefit from fresh community
information.

#### Acceptance Criteria

1. WHEN a user submits a station-condition report, THE Station_Pulse SHALL record the report with a station reference, a condition value, and a timestamp.
2. THE Station_Pulse SHALL tag each newly submitted report with the `UNVERIFIED` Source_Status_Tag and `isSimulated = false`; seeded/corroborated conditions carry `COMMUNITY_REPORTED`, and automatic promotion is FUTURE. *(Amended: the original text said `COMMUNITY_REPORTED`, which conflicted with the design's community-report lifecycle and the implemented MockDataProvider. The lifecycle wins.)*
3. WHEN a report is submitted for a station, THE Pulse_Aggregator SHALL include that report in subsequent aggregation for that station.
4. IF a submitted report is missing a required field, THEN THE Station_Pulse SHALL reject the submission and display which field is required.

### Requirement 10: AI Conversational Explanation [SHOULD HAVE]

**User Story:** As a commuter, I want to ask the assistant to explain the
recommendations in plain language and adjust them to my preference, so that I
understand why a route is suggested.

#### Acceptance Criteria

1. WHEN the AI_Assistant is available and the user asks about the ranked alternatives, THE AI_Assistant SHALL produce a natural-language explanation of the domain results.
2. WHEN the user expresses a preference in natural language, THE AI_Assistant SHALL map that expression to a supported Preference_Profile and request a re-rank, without calculating the ranking itself.
3. IF the AI_Assistant is unavailable, THEN THE GER4K SHALL still display recovery alternatives, ranking, confidence levels, and Station_Pulse, and SHALL show a deterministic explanation instead.
4. THE GER4K SHALL perform all AI calls server-side and SHALL NOT expose AI or AWS credentials to the client.

### Requirement 11: Community Trust Points [NICE TO HAVE]

**User Story:** As a community member, I want to earn trust points for useful
reports, so that I am recognized for contributing reliable information.

#### Acceptance Criteria

1. WHEN a user submits a station-condition report, THE Station_Pulse SHALL award the contributing user trust points.
2. THE Station_Pulse SHALL display a user's accumulated trust points.

### Requirement 12: Saved Journeys [NICE TO HAVE]

**User Story:** As a daily commuter, I want to save a common journey, so that I
can re-plan it quickly without re-entering the details.

#### Acceptance Criteria

1. WHEN a user saves a journey, THE Journey_Planner SHALL store that journey as a saved journey.
2. WHEN a user selects a saved journey, THE Journey_Planner SHALL re-plan it using current data obtained through the Data_Provider interface.

### Requirement 13: Deferred Capabilities [FUTURE / CUT]

**User Story:** As a product owner, I want clearly out-of-scope capabilities
recorded, so that the team does not expand the hackathon MVP beyond the demo.

#### Acceptance Criteria

1. THE GER4K SHALL exclude proactive disruption alerts for saved journeys from the hackathon MVP.
2. THE GER4K SHALL exclude mature community verification and reward/reputation persistence from the hackathon MVP.
3. THE GER4K SHALL exclude full live-feed integration across all operators from the hackathon MVP.
4. THE GER4K SHALL exclude operator, station-team, and authority-facing tooling from the hackathon MVP.

---

# FULL VISION PROTOTYPE Requirements

These requirements extend the CORE tier. They never weaken Requirements 1–11:
the label axes, deterministic ranking, recovery-avoids-blocked-segment and
AI-never-ranks rules all still apply.

### Requirement 14: Journey Cost and Fare Estimate [FULL VISION]

**User Story:** As a commuter, I want to see what a journey costs, so that I can compare routes on price as well as time.

#### Acceptance Criteria

1. THE Fare_Engine SHALL compute, for every public-transport journey option, a total estimated fare and a breakdown by fare component (integrated rail fare, bus fare, free replacement service).
2. THE Fare_Engine SHALL compute fares deterministically from local fare rules and SHALL NOT call external services.
3. WHERE a fare is not verified against an official fare table, THE GER4K SHALL label it `DEMO FARE ESTIMATE` and carry `sourceStatus = ESTIMATED`.
4. THE GER4K SHALL show the fare on route cards without visually overpowering travel time.
5. WHERE a cost is a range (ride-hailing), THE GER4K SHALL present the range rather than a single value.

### Requirement 15: Rich Route Comparison Attributes [FULL VISION]

**User Story:** As a commuter, I want to compare routes on everything that matters to me, so that I can choose with confidence.

#### Acceptance Criteria

1. THE Journey_Options_Engine SHALL attach to every option: total time, transfers, walking metres, fare, crowding level, accessibility-issue count, and confidence.
2. THE Journey_Options_Engine SHALL derive the crowding level deterministically from Station Pulse conditions at stations where the passenger boards, transfers or alights.
3. THE GER4K SHALL display ETA, fare, transfers and walking on every option, and crowding and confidence where they differ meaningfully.
4. THE Journey_Options_Engine SHALL remove options that are dominated on every comparison attribute by another option, and SHALL only present options that win at least one strategy or are the top choice for some Preference_Profile.
5. THE Journey_Options_Engine SHALL assign each presented option one or more strategy tags: `Fastest`, `Cheapest`, `Least walking`, `Fewest changes`, `Least crowded`.

### Requirement 16: Expanded Preference Profiles [FULL VISION]

**User Story:** As a commuter, I want GER4K to rank routes the way I travel, so that the recommendation fits me.

#### Acceptance Criteria

1. THE Ranking_Engine SHALL support `Balanced`, `Fastest`, `Least Walking`, `Fewest Transfers`, `Cheapest`, `Avoid Crowding` and `Accessible`.
2. THE Ranking_Engine SHALL remain a deterministic weighted min–max normalized cost with the defined tie-break, extended with fare, crowding and accessibility-issue attributes.
3. WHEN a journey carries no fare, crowding or accessibility attribute, THE Ranking_Engine SHALL treat that attribute as constant so the MVP ranking behaviour is unchanged.
4. WHEN the user expresses a preference in natural language (e.g. "I'm on a budget", "travelling with my grandmother", "I don't want packed stations"), THE AI_Assistant SHALL map it to a supported profile and SHALL NOT compute the route or ranking.

### Requirement 17: Transit Map / Schematic [FULL VISION]

**User Story:** As a commuter, I want to see my route on a map, so that I understand where the disruption is and where the alternatives go.

#### Acceptance Criteria

1. THE Transit_Map SHALL draw the fixture network lines using official line colours and station positions derived from official GTFS coordinates.
2. WHEN a journey option is selected, THE Transit_Map SHALL highlight that option's path and de-emphasise other lines.
3. WHEN a disruption is active, THE Transit_Map SHALL mark the disrupted segment with a label and a non-colour cue (dashed line and ✕ marker).
4. WHEN recovery alternatives exist, THE Transit_Map SHALL show the selected alternative branching away from the disrupted segment, and SHALL update when another alternative is chosen.
5. THE Transit_Map SHALL show compact Station Pulse indicators on relevant stations and SHALL open the station detail when a station is activated by pointer or keyboard.
6. THE Transit_Map SHALL work fully offline with no external map tiles.

### Requirement 18: Multimodal Journey Planning [FULL VISION]

**User Story:** As a commuter, I want routes that mix rail, bus, walking and, if needed, ride-hailing, so that I see every realistic way to get there.

#### Acceptance Criteria

1. THE Journey_Options_Engine SHALL represent MRT, LRT, Rapid KL bus, MRT feeder bus, replacement bus, walking, interchange walking and ride-hailing legs.
2. THE GER4K SHALL source bus route numbers, names and headways from the official Rapid KL GTFS Static feeds via development-time extraction into local fixtures.
3. WHERE a service only exists inside the simulated scenario (replacement bus), THE GER4K SHALL carry `isSimulated = true` on it and label it simulated.
4. WHERE a bus arrival countdown is mocked, THE GER4K SHALL label it `SIMULATED LIVE DATA`, and SHALL only use `LIVE` for genuinely sourced realtime data.
5. THE Journey_Options_Engine SHALL validate that every recovery option avoids the blocked segment(s), reusing the CORE avoid-validation.

### Requirement 19: Search-First Home [FULL VISION]

**User Story:** As a commuter opening GER4K, I want to start a journey immediately and see what matters today, so that the app is useful even on a normal day.

#### Acceptance Criteria

1. THE Home screen SHALL make "Where are you going?" journey search the most visually dominant element.
2. THE Home screen SHALL show saved journeys and recent searches.
3. THE Home screen SHALL show relevant service status for lines the passenger uses and nearby/relevant transport (including official feeder routes with clearly labelled simulated arrivals).
4. WHEN a saved journey is affected by an active disruption, THE Home screen SHALL show a proactive alert above other content.

### Requirement 20: Journey Search [FULL VISION]

**User Story:** As a commuter, I want a familiar origin/destination search, so that planning feels simple.

#### Acceptance Criteria

1. THE journey search SHALL support origin search, destination search, station suggestions, recent places, saved destinations, swap, "Depart now", a departure time and an optional arrival time.
2. THE journey search SHALL present a large, keyboard-accessible station picker with line indicators.
3. WHEN origin equals destination, THE journey search SHALL block the search and explain why.

### Requirement 21: Journey Results [FULL VISION]

**User Story:** As a commuter, I want my route results separated from the search, so that I can compare and pick quickly.

#### Acceptance Criteria

1. WHEN a search is submitted, THE GER4K SHALL open a journey results surface separate from the search form, with a route summary (O → D, time, fare, changes, walking) and a visual transport sequence.
2. THE journey results SHALL present one recommended option prominently and quieter alternative rows labelled by strategy.
3. WHEN an option is selected, THE journey results SHALL update the Transit_Map and the step-by-step details.
4. THE journey results SHALL offer "Start this route" (a step-by-step journey mode), "Save journey" and contextual Ask GER4K entry points.
5. THE journey results SHALL show arrival clock times derived from the departure or arrival time.

### Requirement 22: In-Place Disruption Recovery [FULL VISION]

**User Story:** As a commuter whose journey is disrupted, I want the same journey screen to tell me it changed and what to do now, so that I recover without hunting.

#### Acceptance Criteria

1. WHEN the planned journey becomes affected, THE journey results SHALL transition in place into recovery mode headed "Your journey has changed" with the affected line and segment.
2. THE recovery mode SHALL immediately present "GER4K recommends" with the top-ranked recovery as the visual focus: time, fare, strategy, transport sequence, changes, walking, relevant Pulse, confidence band, "Start this route" and "Why this route?".
3. THE recovery mode SHALL present only meaningful alternatives (Requirement 15.4), which may include a rail reroute, a less-walking route, a crowd-avoiding route, a bus-supported route and a ride-hailing fallback.
4. THE "SIMULATED DEMO" indication SHALL remain visible but secondary, and SHALL NOT be placed as a large warning above the recovery action.
5. THE recovery mode SHALL keep the original route available, with its affected segment shown, behind progressive disclosure.

### Requirement 23: Ride-Hailing Fallback [FULL VISION]

**User Story:** As a commuter in a hurry during disruption, I want to know if a ride-hail from the last working station is faster, so that I can decide whether the extra cost is worth it.

#### Acceptance Criteria

1. WHEN recovery mode is active, THE GER4K SHALL estimate a rail + ride-hailing fallback from the last unaffected station before the blocked segment to the destination.
2. THE ride-hailing estimate SHALL show a time range and price range labelled `DEMO PRICE ESTIMATE` with `sourceStatus = ESTIMATED`.
3. THE ride-hailing fallback SHALL be shown separately from ranked public-transport options and SHALL NOT be the default recommendation.
4. THE GER4K SHALL NOT integrate with or imply a partnership with any ride-hailing provider.

### Requirement 24: Contextual Station Pulse [FULL VISION]

**User Story:** As a commuter, I want station conditions inside my journey, so that I see crowding where it affects me.

#### Acceptance Criteria

1. THE GER4K SHALL show Station Pulse indicators on the Transit_Map and in route details for stations on the selected route.
2. WHEN a station is opened, THE station detail SHALL show the aggregated condition, report count, freshness, Pulse confidence, trend (rising / steady / easing), service signals, historical demand and "Report condition" / "See reports" actions.
3. THE Pulse trend SHALL be computed deterministically by comparing recent and older report severity.
4. THE dedicated Pulse screen SHALL remain for browsing wider conditions.

### Requirement 25: Structured Community Reporting and GER4K Points [FULL VISION]

**User Story:** As a commuter at a station, I want to report conditions in one or two taps and be thanked, so that I keep helping others.

#### Acceptance Criteria

1. THE Station_Pulse SHALL accept only the structured Station_Report_Type values; free-form text SHALL NOT be accepted.
2. WHEN a report is submitted, THE Station_Pulse SHALL store it with `sourceStatus = UNVERIFIED`, `isSimulated = false`, and SHALL NOT claim it is verified.
3. IF a report is missing a station or report type, THEN THE Station_Pulse SHALL reject it and name the missing field.
4. WHEN a report is accepted, THE GER4K SHALL award +5 GER4K Points locally and show "Thanks for helping other commuters".
5. THE GER4K SHALL derive contributor levels (New Contributor, Reliable Contributor, Community Helper) deterministically from accepted report count.
6. THE GER4K SHALL NOT award points for a duplicate report of the same station and type within 2 minutes.
7. THE GER4K SHALL NOT implement voucher redemption, payments or commercial rewards; future rewards appear only as a labelled roadmap concept.
8. Crowd-type reports SHALL feed the CORE Pulse_Aggregator; service and facility reports SHALL appear as station signals and SHALL NOT dilute crowd aggregation.

### Requirement 26: Service / Lines Status [FULL VISION]

**User Story:** As a commuter, I want a quick view of line status, so that I know before I travel.

#### Acceptance Criteria

1. THE Service screen SHALL list the fixture rail lines with official names, colours and operator, and a status (Normal, Disrupted, Busy).
2. THE line detail SHALL layer information as: service notice, community conditions, then GER4K decision support for the passenger's journey.
3. WHERE the line status comes from the prototype's demo status feed rather than a live operator feed, THE GER4K SHALL label it as demo status, and a simulated disruption SHALL be shown as simulated and unverified — never operator-confirmed.
4. THE Service screen SHALL list relevant official bus routes with headways from GTFS Static labelled `SCHEDULED`.

### Requirement 27: Historical Demand [FULL VISION]

**User Story:** As a commuter, I want to know if a station is usually busy, so that I can anticipate crowding during disruptions.

#### Acceptance Criteria

1. THE GER4K SHALL derive a Historical_Demand band for each fixture station from the official `ridership_od_rapidrail_daily` dataset by development-time extraction into a local fixture.
2. THE Historical_Demand band SHALL be computed deterministically from the station's percentile rank of average weekday tap-in plus tap-out trips.
3. THE GER4K SHALL always label historical demand `HISTORICAL` and SHALL NOT present it as live crowding.
4. THE GER4K SHALL explain the caveat that tap-in/tap-out data excludes interchange transfers inside the paid area.
5. Historical demand MAY appear in station detail, disruption impact and route explanations; it SHALL NOT change the ranking.

### Requirement 28: Saved Journeys [FULL VISION] (extends Requirement 12)

**User Story:** As a daily commuter, I want to save journeys like "Home → Work", so that I can re-plan in one tap.

#### Acceptance Criteria

1. WHEN a user saves a journey, THE GER4K SHALL store it in localStorage with a passenger label.
2. WHEN a user selects a saved journey, THE Journey_Planner SHALL re-plan it with current data.
3. THE GER4K SHALL allow renaming and removing saved journeys, and SHALL require no authentication.

### Requirement 29: Proactive Saved-Journey Alert [FULL VISION]

**User Story:** As a daily commuter, I want GER4K to warn me when my usual journey is disrupted, so that I can recover before I leave.

#### Acceptance Criteria

1. WHEN a disruption is active, THE GER4K SHALL evaluate every saved journey with the CORE Disruption_Monitor.
2. IF a saved journey is affected, THEN THE GER4K SHALL show an in-app alert ("Your usual journey may be disrupted") with the journey, the affected segment and a "View recovery" action.
3. THE alert SHALL be local/simulated and labelled as a prototype alert; production push notifications are FUTURE.

### Requirement 30: Accessibility and Mobility Preferences [FULL VISION]

**User Story:** As a passenger with mobility needs, I want to tell GER4K how I travel, so that routes suit me.

#### Acceptance Criteria

1. THE Profile SHALL let the user select mobility needs: Less walking, Fewer transfers, Avoid stairs, Wheelchair-friendly, Travelling with elderly passenger.
2. THE GER4K SHALL map selected mobility needs deterministically to a default Preference_Profile.
3. THE GER4K SHALL only state accessibility facts present in the data (the official GTFS `isOKU` station flag and community lift/escalator reports), and SHALL NOT claim step-free interchanges or lift availability it does not have.

### Requirement 31: Ask GER4K Mobility Co-Pilot [FULL VISION] (extends Requirement 10)

**User Story:** As a commuter, I want to ask short questions about my options, so that I get a concise, actionable answer.

#### Acceptance Criteria

1. THE Ask GER4K surface SHALL remain contextual (sheet/panel), with no dedicated AI tab.
2. THE AI_Assistant SHALL support: Why this route? Why this confidence? Can I avoid TRX? Which option is cheaper? Is there a bus alternative? Which route has less walking? I'm travelling with my grandmother. What is happening at TRX?
3. THE GER4K SHALL map each question deterministically to an intent and SHALL build a structured answer (headline, metrics, short reasons, an optional suggested option, follow-up actions) from domain results only.
4. WHEN an answer suggests a different option, THE GER4K SHALL let the user apply it in one tap ("Use this route"), updating the selection and map.
5. THE AI provider MAY rephrase the answer text but SHALL NOT invent routes, stations, fares or operational facts, and SHALL NOT change the suggested option.
6. IF `/api/ask` is unreachable, THEN THE GER4K SHALL compose the same deterministic answer locally.

### Requirement 32: Confidence Presentation [FULL VISION] (extends Requirement 6.4)

**User Story:** As a commuter, I want confidence in plain words, so that I understand reliability without reading a formula.

#### Acceptance Criteria

1. THE GER4K SHALL show the confidence band in words (e.g. "Medium confidence") as the primary visual, not the numeric score.
2. WHEN the user asks "Why?", THE GER4K SHALL list the factors translated into natural language, and SHALL show the numeric score only in that expanded detail.
3. THE GER4K SHALL show raw factor deltas only in a developer/presenter mode.
4. THE CORE Confidence_Indicator algorithm SHALL remain unchanged except that `HISTORICAL` and `ESTIMATED` are recognised source statuses.

### Requirement 33: Progressive Source Transparency [FULL VISION] (refines Requirement 2)

**User Story:** As a commuter, I want the important information first and the source detail on demand, so that the screen stays calm.

#### Acceptance Criteria

1. THE GER4K SHALL keep `sourceStatus` and `isSimulated` on every record in the data model.
2. THE GER4K SHALL show primary passenger information first and source detail second (e.g. a single quiet "Scheduled · Demo fare estimate" line or a "Sources" disclosure), rather than many simultaneous badges.
3. THE GER4K SHALL still never present `SCHEDULED`, `HISTORICAL` or `ESTIMATED` information as `LIVE`, and simulated records SHALL remain identifiable as simulated wherever they appear.

### Requirement 34: Consumer Mobility Layout [FULL VISION] (extends Requirement 8)

**User Story:** As a commuter and as a judge on a projector, I want a calm consumer mobility layout, so that I understand it in about three seconds.

#### Acceptance Criteria

1. THE primary navigation SHALL be Home, Pulse, Service and Saved/Profile (fewer than five items), with no AI tab and Presenter Control kept separate and gated.
2. At approximately 1200–1400px, THE journey surfaces SHALL use a split layout: a left panel of about 35–40% and a map panel of about 60–65%.
3. At approximately 390px, THE journey surfaces SHALL use a map with an overlapping bottom sheet, tap targets of at least 44px and no horizontal scrolling.
4. THE GER4K SHALL use a predominantly light neutral palette, selective indigo brand accent, authentic line colours that do not compete with the brand, and a strong type hierarchy (page titles 24–36px, important ETA 32–48px).
5. THE GER4K SHALL reduce nested cards and simultaneous badges in favour of whitespace, typography, dividers and one dominant recommendation.

### Requirement 35: Resilience Without Live Data [FULL VISION]

**User Story:** As a presenter, I want the full experience to work offline, so that the demo never depends on a live feed.

#### Acceptance Criteria

1. THE GER4K SHALL run the complete full-vision demo with no runtime external data calls other than the optional Ask GER4K AI call.
2. IF localStorage is unavailable, THEN THE GER4K SHALL continue with in-memory state.
3. THE Presenter Control SHALL be able to activate and reset the scenario and clear local prototype data.

### Requirement 36: Production / Future Capabilities [FUTURE]

**User Story:** As a product owner, I want production infrastructure recorded as out of scope, so that the prototype stays focused.

#### Acceptance Criteria

1. THE GER4K SHALL exclude production authentication, payment processing, commercial integrations and real voucher redemption.
2. THE GER4K SHALL exclude production push-notification infrastructure, production moderation and automatic report verification.
3. THE GER4K SHALL exclude a full GTFS ingestion pipeline, GTFS Realtime as a dependency, whole-Klang-Valley coverage, enterprise backends, microservices and Kubernetes.

---

# FRONTEND REDESIGN PHASE Requirements

This is a PRESENTATION-ONLY phase on top of the completed Full Vision Prototype.
It does not change transport/domain logic, data, fixtures, tests or deployment.
It makes GER4K feel like a premium Klang Valley mobility product by fixing
information hierarchy, visual polish and transport UX. Gerak Khas is NOT part of
this phase.

### Requirement 37: Visual Hierarchy and Typography [REDESIGN]

**User Story:** As a commuter, I want the important information to stand out, so that I understand a screen in about three seconds.

#### Acceptance Criteria

1. THE GER4K SHALL use a strengthened type scale with page headings ~24–32px, route/destination titles ~20–28px, a hero ETA ~32–48px, card headings ~16–18px, body ~13–16px and metadata no smaller than ~11px where practical.
2. THE GER4K SHALL present one clearly dominant element per primary screen (search on Home, the recommendation on recovery) rather than sections of near-equal weight.
3. THE GER4K SHALL keep passenger-critical information (ETA, destination, route, disruption) readable on a projector.
4. THE GER4K SHALL reduce visual noise by preferring spacing, typography, mode icons, line colour and status colour over borders, nested cards, repeated labels and competing badges.
5. THE redesign SHALL NOT change any transport/domain logic, data provider, fixture, type, test or deployment configuration.

### Requirement 38: Transit Map Readability [REDESIGN]

**User Story:** As a commuter, I want the schematic to read like a transit map, so that labels support the journey instead of covering it.

#### Acceptance Criteria

1. THE Transit_Map SHALL render station labels at a size proportional to the map that does not dominate the view, keeping the existing offline SVG schematic (no heavy mapping SDK).
2. THE Transit_Map SHALL tier station prominence: stations on the selected route are strong, contextually relevant stations medium, and unrelated stations muted.
3. THE Transit_Map SHALL emphasise the selected route and dim unselected network lines in the normal state.
4. WHEN a disruption is active, THE Transit_Map SHALL show the original route faded, the affected segment clearly broken/red with a marker, the selected recovery strongly highlighted, other recovery options lighter, and relevant Pulse station markers.
5. WHEN another recovery option is selected, THE Transit_Map SHALL update immediately.

### Requirement 39: Home Information Architecture [REDESIGN]

**User Story:** As a commuter opening GER4K, I want a clear order of importance, so that planning a journey is obvious.

#### Acceptance Criteria

1. THE Home screen SHALL order content as: journey search (dominant), saved/recent journeys, nearby/relevant transport, service status, then a Station Pulse snapshot.
2. THE Home screen SHALL show only ~2–3 saved/recent journeys initially with a "View all" affordance rather than a long list.
3. THE Home screen SHALL show nearby transport (rail line status plus Rapid KL bus and MRT feeder arrivals) as a legitimate, visible section, not a buried table.
4. THE Home screen SHALL present service status as scannable status rows and the Pulse snapshot as a lightweight preview with a link to the full Pulse screen.

### Requirement 40: Route Options and Transport Modes [REDESIGN]

**User Story:** As a commuter comparing routes, I want comfortable, readable options with recognisable modes, so that I can choose quickly.

#### Acceptance Criteria

1. THE journey results SHALL present route strategies as comfortable cards/rows with a strong ETA, fare, changes and walking, not as dense spreadsheet rows.
2. THE GER4K SHALL make transport modes immediately recognisable using an icon plus the official line colour for MRT, LRT, Rapid KL bus, MRT feeder and walking.
3. THE GER4K SHALL provide a reusable bus/feeder visual treatment showing the service, arrival estimate, direction and an honest source label (SCHEDULED or SIMULATED LIVE DATA).
4. WHEN a disruption is active and a valid bus option exists, THE GER4K SHALL display it alongside rail alternatives rather than as an afterthought.

### Requirement 41: Recovery Hero Presentation [REDESIGN]

**User Story:** As a disrupted commuter, I want the recommendation to be unmistakably the strongest element, so that I know what to do immediately.

#### Acceptance Criteria

1. THE recovery view SHALL lead with a clear "Your journey has changed" header naming the disruption and affected segment, with the "SIMULATED DEMO" indication present but secondary.
2. THE recovery view SHALL present the recommended option as the visually dominant element with a large ETA, fare, strategy, transport sequence, changes, walking, relevant Pulse conditions, confidence band, and "Start this route" / "Why this route?" actions.
3. THE preference control SHALL use comfortable, obviously-selectable options and SHALL be horizontally scrollable on mobile where needed.
4. THE recovery view SHALL present other recovery options as compact but readable rows that remain visually weaker than the recommendation.

### Requirement 42: Pulse, Service and Profile Polish [REDESIGN]

**User Story:** As a commuter, I want Pulse, Service and Saved/Profile to feel clean and scannable, so that the whole product feels consistent.

#### Acceptance Criteria

1. THE Station_Pulse screen SHALL present station cards that are scannable and not overcrowded, keeping the existing aggregation logic.
2. THE station detail drawer SHALL order content as station name, current condition, latest summary, report action, recent reports, historical demand and lines served, with detailed source information secondary and never above the primary action.
3. THE Service screen SHALL present each line as a clear row with a line badge, name, affected segment where relevant and status, and SHALL list bus services separately with honest source labels; the line-detail layering (Official/Service, Community, GER4K impact) SHALL be preserved and visually clarified.
4. THE Saved/Profile screen SHALL keep its structure and make GER4K Points feel motivating but secondary, not like a financial product, with comfortable mobility-need switches.

### Requirement 43: Responsive Redesign Integrity [REDESIGN]

**User Story:** As a commuter on mobile and a judge on a projector, I want the redesign to work on both without compromise.

#### Acceptance Criteria

1. THE GER4K SHALL keep the desktop split layout with the left decision panel at ~38–42% and the map at ~58–62%, without compressing the left panel into tiny text.
2. At ~390px, THE GER4K SHALL present a map/journey-context plus bottom-sheet (or clean single-column) experience with no horizontal overflow, ~44px touch targets, readable ETA and station names, a visible recovery CTA, scrollable preferences and progressively disclosed source detail.
3. THE GER4K SHALL apply only subtle UI motion (~150–250ms) for selection, re-ranking, map highlight, drawer open and status/disruption transitions, and SHALL respect `prefers-reduced-motion`.
4. THE existing Ask GER4K functionality SHALL remain operational with readable, less-technical text and the deterministic fallback intact; it SHALL NOT be reworked in this phase.
