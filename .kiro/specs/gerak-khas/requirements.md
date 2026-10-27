# Requirements Document

## Introduction

Gerak Khas is an intelligent mobility co-pilot that extends the existing GER4K Next.js application for Klang Valley public-transport users. It presents as an original small robot companion with a chat user interface and helps passengers understand and act on mobility information across journey planning, disruption recovery, MRT/LRT stations, Rapid KL buses, MRT feeder buses, fares, walking and pedestrian connections, interchange walking, station crowding, Station Pulse, service status, accessibility and mobility needs, historical demand, route recommendations, source transparency, and visual station information.

Gerak Khas is a feature-level extension. It reuses the existing GER4K domain modules (`src/domain/*`), data provider (`mockDataProvider` from `@/data`), deterministic Ask GER4K pipeline (`answerAsk` in `src/services/ai/askAnswer.ts`), AI provider abstraction (`src/services/ai/AiProvider.ts`, `BedrockAiProvider`, `isAiConfigured`/`getAiProvider`), shared state (`Ger4kStore`), and shared types (`src/types`). It does not rebuild GER4K, does not duplicate domain calculations, and does not modify the `ger4k-hackathon-mvp` spec or its completed tasks.

The governing principle is evidence-before-AI: Gerak Khas uses structured GER4K domain information before any AI-generated language, and the AI layer never invents transport facts. All AI and image-provider calls remain server-side so AWS and Bedrock credentials never reach the browser.

The requirements are grouped to reflect four implementation phases: Phase 1 (character and chat shell), Phase 2 (mobility tools over existing domain logic), Phase 3 (orchestrator, context model, structured response contract, actions, deterministic fallback, optional AI explanation), and Phase 4 (visual/image capability).

## Glossary

- **Gerak_Khas**: The mobility co-pilot feature, comprising the robot companion character, the chat experience, the orchestrator, the mobility tools, and the visual capability.
- **Companion_Character**: The original small robot avatar that represents Gerak_Khas on screen, with expressive states and movement behaviour.
- **Chat_Panel**: The compact, non-page-dominating chat surface — a floating panel/popover on desktop and a bottom sheet on mobile.
- **Orchestrator**: The service that maps a passenger question and the current context to one primary intent, invokes one or more appropriate Mobility_Tools to gather evidence, and assembles a Gerak_Khas_Response. The Orchestrator is deterministic and bounded: it issues a fixed, finite set of tool calls per question and is not an autonomous or uncontrolled agent loop.
- **Mobility_Tool**: A clean TypeScript service that wraps existing GER4K domain logic for one capability. The named tools are JourneyTool, RecoveryTool, RankingTool/RecommendationTool, StationTool, BusTool, FareTool, WalkingTool, PulseTool, ServiceStatusTool, AccessibilityTool, HistoricalDemandTool, and VisualTool.
- **Journey_Planner**: The existing journey-planning logic in `src/domain/transport/journeyPlanner.ts` (invoked via `planJourneyOnNetwork`). Reused by JourneyTool; its calculations are never duplicated.
- **Recovery_Engine**: The existing recovery logic in `src/domain/recovery/recoveryEngine.ts` (invoked via `findRecovery` / `generateAlternatives`). Reused by RecoveryTool; its calculations are never duplicated.
- **Ranking_Engine**: The existing route-ranking logic in `src/domain/recovery/rankingEngine.ts` (invoked via `rankAlternatives`, re-exported through `src/domain/recovery`), which is the only component permitted to rank or re-rank routes. Its preference profiles are exactly Balanced, Fastest, Cheapest, Least Walking, Fewest Transfers, Avoid Crowding, and Accessible.
- **Fare_Engine**: The existing fare logic in `src/domain/fare/fareEngine.ts` (invoked via `computeJourneyFare`, using FareRules from `provider.getFareRules()`). Every fare it produces carries `sourceStatus = ESTIMATED` and `isSimulated = false`, is held in sen, and is formatted to RM via `formatRinggit`. Reused by FareTool; its calculations are never duplicated.
- **Pulse_Aggregator**: The existing Station Pulse aggregation logic in `src/domain/community/pulseAggregator.ts` (invoked via `aggregatePulse` / `aggregatePulseForStation`). Reused by PulseTool; its aggregation algorithm is never re-implemented.
- **Historical_Demand**: The existing historical demand logic in `src/domain/demand/historicalDemand.ts` (invoked via `historicalDemandFor`); its records carry `sourceStatus = HISTORICAL`.
- **Service_Status_Source**: The existing line-status and arrivals logic in `src/domain/service/lineStatus.ts` (`deriveLineStatuses`) and `src/domain/service/arrivals.ts` (`simulatedNextArrivalMin`). Reused by ServiceStatusTool and for simulated arrival estimates.
- **Multimodal_Fixture**: The existing structured bus, feeder, and walking fixture in `src/data/mock/multimodal.ts` (GTFS-backed Rapid KL bus 300, the simulated Replacement bus, and walk links with `walkMeters`), exposed via `provider.getMultimodalNetwork({ includeScenarioServices })`. Walking distances come from segment, interchange, and walk-link `walkMeters` and journey totals; there is no separate walking engine.
- **Accessibility_Uncertainty_Model**: A new small deterministic component added by Gerak Khas. The repo contains no per-station accessibility or facility dataset (only a MobilityNeed-to-profile mapping in `src/domain/personal` and the Accessible ranking profile), so the AccessibilityTool surfaces the Accessible ranking preference and reports, honestly and by default, that verified lift, escalator, and facility status is not available. It is not an existing accessibility engine.
- **Station_Image_Reference_Model**: A new small structured station-image reference model and fixture added by Gerak Khas for the factual reference photo mode. The `DataProvider` has no station image, photo field, or method, so this component holds curated images intentionally approved for GER4K together with their required source metadata.
- **Gerak_Khas_Response**: The structured response model assembled before any chat rendering, with fields `answer`, `evidence?`, `source?`, `routeRecommendation?`, `suggestedPreference?`, `actions?`, `visual?`, `confidence?`, `warnings?`. Each evidence item and tool output carries both a `sourceStatus` value and a separate `isSimulated` flag; the `source` and `warnings` fields never collapse the two axes into one.
- **Gerak_Khas_Action**: A machine-readable action attached to a Gerak_Khas_Response. The action type is one of SELECT_ROUTE, SET_PREFERENCE, OPEN_STATION, OPEN_PULSE, SHOW_SERVICE, SHOW_BUS, SHOW_VISUAL, REPORT_CONDITION.
- **Context_Model**: The snapshot of the passenger's current GER4K context available to Gerak_Khas: current origin, destination, journey, selected route, alternatives, active disruption, ranking preference, relevant Station Pulse, selected station, fare info, walking info, and source statuses.
- **Deterministic_Fallback**: The evidence-based response produced without any AI model, reusing `answerAsk` and the Mobility_Tools, used whenever the AI provider is unavailable.
- **AI_Explanation_Layer**: The optional, server-side Bedrock step that rephrases the lead language of an already-assembled Gerak_Khas_Response without changing its facts, ranking, routing, or pricing.
- **Visual_Capability**: The station-image feature supporting a factual reference photo mode and an AI-generated illustration mode.
- **Image_Provider**: The server-side image-generation provider invoked through a Gerak_Khas image API route.
- **Source_Status**: The existing GER4K information-source confidence label (the `SourceStatus` type in `src/types/labels.ts`), with the values LIVE, SCHEDULED, OPERATOR_CONFIRMED, COMMUNITY_REPORTED, UNVERIFIED, HISTORICAL, and ESTIMATED. SIMULATED is not a Source_Status value.
- **Is_Simulated**: The existing GER4K simulation-status boolean (the `isSimulated` field of the `Labelled` interface in `src/types/labels.ts`). Source_Status and Is_Simulated are two independent axes that every displayed record carries together (`{ sourceStatus, isSimulated }`); neither is derived from or collapsed into the other. The single scenario rule is that a simulated record is never OPERATOR_CONFIRMED. Examples: a normal scheduled rail fixture is `sourceStatus = SCHEDULED, isSimulated = false`; the simulated TRX-Conlay demo disruption is `sourceStatus = UNVERIFIED, isSimulated = true`; a seeded TRX Station Pulse report is `sourceStatus = COMMUNITY_REPORTED, isSimulated = true`; a report submitted by the current prototype user is `sourceStatus = UNVERIFIED, isSimulated = false`.
- **Simulated_Live_Label**: The human-facing UI text "SIMULATED LIVE DATA". It is presentation only, derived from `isSimulated === true` together with the relevant Source_Status, and is never stored as a Source_Status value.
- **Reduced_Motion**: The operating-system or browser `prefers-reduced-motion` user preference.
- **Desktop_Width**: A viewport whose width is 768 CSS pixels or greater.
- **Mobile_Width**: A viewport whose width is less than 768 CSS pixels.
- **Edge_Dock_Threshold**: A distance of 48 CSS pixels or less from a viewport edge, at which the Companion_Character docks to that edge.

## Requirements

### Requirement 1: Companion Character Rendering (Phase 1)

**User Story:** As a GER4K passenger, I want an original friendly robot companion on screen, so that I recognise Gerak Khas as an inviting mobility assistant.

#### Acceptance Criteria

1. THE Companion_Character SHALL render as an original small robot with a small head, expressive digital eyes or visor, an antenna or status light, a compact rounded body, small arms or side modules, a small wheel, foot, or hovering base, and GER4K or G4 branding.
2. WHEN the Companion_Character is rendered, THE Companion_Character SHALL present rounded body contours, a visible facial feature that conveys expression, and a GER4K or G4 branding mark.
3. THE Companion_Character SHALL NOT reproduce the design of any known copyrighted robot character.
4. WHILE the operating system or browser reports the Reduced_Motion preference, THE Companion_Character SHALL suppress non-essential motion and present a static or minimally animated state.

### Requirement 2: Companion Character States (Phase 1)

**User Story:** As a passenger, I want the companion to reflect what is happening, so that I can read its state at a glance.

#### Acceptance Criteria

1. WHILE Gerak_Khas is idle, THE Companion_Character SHALL display the IDLE state with a bobbing animation whose vertical displacement is 6 CSS pixels or less.
2. WHEN the Chat_Panel gains focus for input, THE Companion_Character SHALL display the LISTENING state and SHALL orient its eyes toward the chat within 300 milliseconds.
3. WHILE the Orchestrator is preparing a response, THE Companion_Character SHALL display the THINKING state with a loading or eye animation.
4. WHEN a response is delivered successfully, THE Companion_Character SHALL display the SUCCESS state with an acknowledgement animation that completes within 1500 milliseconds and plays once per delivered response.
5. WHILE the Context_Model reports an active disruption of moderate severity and no active severe disruption, THE Companion_Character SHALL display the DISRUPTION state with an amber antenna indicator.
6. WHILE the Context_Model reports an active severe disruption, THE Companion_Character SHALL display the SEVERE state with a red status indicator, taking precedence over the DISRUPTION state.
7. THE Companion_Character SHALL limit state animations so that it does not continuously bounce or interrupt the passenger.
8. WHILE the Reduced_Motion preference is active, THE Companion_Character SHALL convey each state through a static indicator rather than looping animation.

### Requirement 3: Companion Movement on Desktop (Phase 1)

**User Story:** As a desktop passenger, I want to move the companion out of my way, so that it never blocks the content I need.

#### Acceptance Criteria

1. WHERE the viewport is a Desktop_Width, THE Companion_Character SHALL be draggable using Pointer Events.
2. WHILE the passenger drags the Companion_Character, THE Gerak_Khas SHALL constrain the companion position within the visible viewport bounds.
3. WHEN the passenger releases the Companion_Character within the Edge_Dock_Threshold of a viewport edge, THE Gerak_Khas SHALL dock the companion to that edge.
4. THE Chat_Panel SHALL provide an accessible Dock Left control and an accessible Dock Right control for the Companion_Character.
5. THE Gerak_Khas SHALL store the Companion_Character position as local client state only and SHALL NOT persist the position to any account or server.

### Requirement 4: Companion Movement on Mobile (Phase 1)

**User Story:** As a mobile passenger, I want the companion to stay out of the way of scrolling, so that I can still use GER4K comfortably on a small screen.

#### Acceptance Criteria

1. WHERE the viewport is a Mobile_Width, THE Gerak_Khas SHALL dock the Companion_Character to the left viewport edge or the right viewport edge and SHALL NOT support unrestricted two-axis dragging.
2. WHERE the viewport is a Mobile_Width AND limited vertical movement is enabled, THE Gerak_Khas SHALL constrain Companion_Character movement to the vertical axis along the current docked edge within the viewport bounds.
3. THE Chat_Panel SHALL provide an accessible Dock Left control and an accessible Dock Right control for the Companion_Character at a Mobile_Width.
4. WHERE the viewport is a Mobile_Width, THE Companion_Character SHALL present a touch target of at least 44 by 44 CSS pixels.
5. WHILE the viewport is a Mobile_Width, THE Gerak_Khas SHALL leave normal page scrolling of GER4K unaffected by the Companion_Character.

### Requirement 5: Chat Panel Presentation (Phase 1)

**User Story:** As a passenger, I want a compact assistant that does not take over the screen, so that I can keep using GER4K while I chat.

#### Acceptance Criteria

1. WHEN the passenger activates the Companion_Character, THE Gerak_Khas SHALL open the Chat_Panel within 300 milliseconds.
2. WHERE the viewport is a Desktop_Width, THE Chat_Panel SHALL render as a floating panel or popover occupying at most 50 percent of the viewport width and at most 80 percent of the viewport height.
3. WHERE the viewport is a Mobile_Width, THE Chat_Panel SHALL render as a bottom sheet occupying at most 80 percent of the viewport height on first open.
4. WHEN the Chat_Panel opens for the first time in a session, THE Gerak_Khas SHALL display the opening message "Hi, I'm Gerak Khas 👋 Ask me about your route, stations, buses, fares, walking, crowding or service conditions."
5. THE Chat_Panel SHALL provide a free-text input that accepts passenger questions of 1 to 500 characters.
6. IF the passenger submits input that is empty or exceeds 500 characters, THEN THE Chat_Panel SHALL retain the typed text, SHALL indicate that the input length is invalid, and SHALL NOT submit the question to the Orchestrator.

### Requirement 6: Contextual Quick Actions (Phase 1)

**User Story:** As a passenger, I want one-tap suggestions relevant to what I am doing, so that I can ask common questions without typing.

#### Acceptance Criteria

1. WHERE the Context_Model contains a selected route, THE Chat_Panel SHALL offer the quick actions "Why this route?", "Bus alternative", "Less walking", "Avoid crowds", "Fare", and "Station info".
2. WHEN the passenger selects a quick action, THE Gerak_Khas SHALL submit the corresponding question to the Orchestrator.
3. WHERE a quick action is not applicable to the current Context_Model, THE Chat_Panel SHALL hide that quick action.
4. WHERE the Context_Model contains no selected route, THE Chat_Panel SHALL hide the route-dependent quick actions "Why this route?", "Bus alternative", "Less walking", "Avoid crowds", and "Fare".

### Requirement 7: Non-Replacement of GER4K UI (Phase 1)

**User Story:** As a passenger, I want to use GER4K normally without the co-pilot, so that Gerak Khas enhances the app rather than replacing it.

#### Acceptance Criteria

1. THE Gerak_Khas SHALL allow the passenger to search journeys, inspect routes, browse Station Pulse, view Service status, and submit reports without opening the Chat_Panel.
2. WHILE the Chat_Panel is open, THE Chat_Panel SHALL NOT obscure or disable the existing GER4K navigation controls, and those controls SHALL remain interactive.
3. THE Gerak_Khas SHALL add the Companion_Character and Chat_Panel without removing, disabling, or obscuring any existing GER4K navigation or screen.

### Requirement 8: Mobility Tool Boundary (Phase 2)

**User Story:** As a developer, I want each mobility capability wrapped as a clean service over existing domain logic, so that Gerak Khas reuses GER4K rather than duplicating it.

#### Acceptance Criteria

1. THE Gerak_Khas SHALL expose exactly one Mobility_Tool per capability across JourneyTool, RecoveryTool, RankingTool/RecommendationTool, StationTool, BusTool, FareTool, WalkingTool, PulseTool, ServiceStatusTool, AccessibilityTool, HistoricalDemandTool, and VisualTool.
2. THE JourneyTool, RecoveryTool, RankingTool/RecommendationTool, FareTool, PulseTool, ServiceStatusTool, and HistoricalDemandTool SHALL compute their results by delegating to the existing GER4K domain modules Journey_Planner, Recovery_Engine, Ranking_Engine, Fare_Engine, Pulse_Aggregator, Service_Status_Source, and Historical_Demand respectively, through the `mockDataProvider` data provider.
3. THE BusTool and WalkingTool SHALL read bus, feeder, and walking data from the existing Multimodal_Fixture via `provider.getMultimodalNetwork`, and THE WalkingTool SHALL obtain walking distances from the existing `walkMeters` data rather than from a separate walking engine.
4. THE Mobility_Tools SHALL NOT recompute route rankings, fares, confidence scores, or walking distances independently of the existing domain modules.
5. WHEN route ranking is required, THE RankingTool SHALL obtain the ranking from the existing Ranking_Engine in `src/domain/recovery/rankingEngine.ts` via `rankAlternatives`.
6. WHERE a capability has no existing GER4K domain module, specifically station accessibility facilities and factual station images, THE Gerak_Khas SHALL back the AccessibilityTool with the new Accessibility_Uncertainty_Model and THE VisualTool factual reference photo mode with the new Station_Image_Reference_Model, rather than naming a nonexistent existing engine.
7. THE Mobility_Tools SHALL return JSON-serializable data containing no functions, class instances, or circular references so that the results can populate a Gerak_Khas_Response.
8. THE Mobility_Tool evidence and tool outputs SHALL carry a `sourceStatus` value and a separate `isSimulated` flag and SHALL NOT collapse the two axes into one.
9. IF the data a Mobility_Tool requires is unavailable, THEN THE Mobility_Tool SHALL return a result indicating that the data is unavailable rather than fabricated values.

### Requirement 9: Structured Response Contract (Phase 3)

**User Story:** As a developer, I want a structured response model assembled before rendering, so that behaviour such as navigation is explicit data rather than parsed prose.

#### Acceptance Criteria

1. THE Orchestrator SHALL assemble a Gerak_Khas_Response with a required `answer` field and the optional fields `evidence`, `source`, `routeRecommendation`, `suggestedPreference`, `actions`, `visual`, `confidence`, and `warnings` before the Chat_Panel renders a reply.
2. THE Chat_Panel SHALL render each reply only from a Gerak_Khas_Response.
3. WHERE a reply drives a navigation or state change, THE Orchestrator SHALL encode that behaviour as a Gerak_Khas_Action in the `actions` field and SHALL NOT encode the behaviour only in the `answer` prose.
4. THE `actions` field SHALL use only the closed set of action types SELECT_ROUTE, SET_PREFERENCE, OPEN_STATION, OPEN_PULSE, SHOW_SERVICE, SHOW_BUS, SHOW_VISUAL, and REPORT_CONDITION, and SHALL NOT include any other action type.
5. WHERE a Gerak_Khas_Response presents a value, THE Gerak_Khas_Response SHALL carry that value's Source_Status value and its separate Is_Simulated flag in its `source` or `warnings` field, and SHALL NOT collapse the two axes into a single value.
6. IF the assembled `answer` is empty, THEN THE Orchestrator SHALL set `answer` to a fallback message stating that no answer is available before the Chat_Panel renders the reply.

### Requirement 10: Context Awareness (Phase 3)

**User Story:** As a passenger, I want the co-pilot to understand what I am currently looking at, so that short questions resolve to my active journey.

#### Acceptance Criteria

1. THE Orchestrator SHALL read the Context_Model fields current origin, destination, journey, selected route, alternatives, active disruption, ranking preference, relevant Station Pulse, selected station, fare info, walking info, and source statuses where each is available.
2. WHEN the passenger asks a question that refers to the current journey without naming origin and destination, THE Orchestrator SHALL resolve the question against the current journey in the Context_Model.
3. WHEN the Context_Model contains the journey Putrajaya Sentral to KLCC and the passenger asks for less walking, THE Orchestrator SHALL return a route recommendation for that journey with a SELECT_ROUTE action and an `answer` that compares the walking distance of the recommended route against the walking distance of the currently selected route.
4. IF a question requires a Context_Model field that is unavailable, THEN THE Orchestrator SHALL state that the required context is not available rather than fabricating the field.
5. IF the passenger asks a journey-dependent question and the Context_Model contains no current journey, THEN THE Orchestrator SHALL state that no journey is currently in context.

### Requirement 11: Intent and Tool Routing (Phase 3)

**User Story:** As a passenger, I want my question routed to the right capability, so that I get a relevant answer.

#### Acceptance Criteria

1. WHEN the passenger submits a question, THE Orchestrator SHALL classify the question into exactly one primary intent using deterministic rules rather than an AI model.
2. WHEN a primary intent is determined, THE Orchestrator SHALL invoke one or more Mobility_Tools to gather evidence for that question, and THE Orchestrator SHALL issue a fixed, finite set of tool calls per question rather than an autonomous or uncontrolled agent loop.
3. THE Orchestrator SHALL route journey, recovery, ranking, station, bus, fare, walking, crowding, Station Pulse, service status, accessibility, historical demand, and visual questions to their corresponding Mobility_Tools, and MAY combine several of these tools for a single question. For example, "cheapest option" invokes RankingTool and FareTool; "avoid crowded TRX" invokes PulseTool and RankingTool; "easiest route for my grandmother" invokes AccessibilityTool, WalkingTool, and RankingTool; and "bus that's cheaper with less walking" invokes BusTool, FareTool, WalkingTool, and RankingTool.
4. WHEN route ordering or ranking is required for a multi-tool question, THE Orchestrator SHALL obtain that ordering only from the Ranking_Engine, and THE Mobility_Tools SHALL provide evidence while the AI layer never calculates any transport decision.
5. IF the primary intent cannot be mapped to any supported Mobility_Tool, THEN THE Orchestrator SHALL return an honest message that the question is not supported.
6. GIVEN identical question text and identical Context_Model, THE Orchestrator SHALL classify the question into the same primary intent and SHALL invoke the same set of Mobility_Tools on repeated requests.

### Requirement 12: Evidence Before AI (Phase 3)

**User Story:** As a passenger, I want answers grounded in real GER4K data, so that I can trust what the co-pilot tells me.

#### Acceptance Criteria

1. THE Orchestrator SHALL populate the Gerak_Khas_Response fields `evidence`, `source`, `routeRecommendation`, `suggestedPreference`, and `actions` from Mobility_Tool evidence before any AI-generated language is produced.
2. THE AI_Explanation_Layer SHALL NOT originate or supply routes, stations, disruptions, bus services, fares, walking connections, accessibility information, station facilities, crowd conditions, or any other operational fact that is missing from the assembled Gerak_Khas_Response.
3. IF the required structured data for a question is unavailable, THEN THE Gerak_Khas SHALL state that it does not have reliable information for that question.
4. WHEN the AI_Explanation_Layer rephrases the lead language of an already-assembled Gerak_Khas_Response, THE AI_Explanation_Layer SHALL leave the `evidence`, `routeRecommendation`, `suggestedPreference`, `actions`, `source`, and label values byte-for-byte unchanged.

### Requirement 13: Response Design (Phase 3)

**User Story:** As a passenger, I want short, actionable, plainly labelled answers, so that I can act quickly and know how reliable each value is.

#### Acceptance Criteria

1. THE Gerak_Khas_Response SHALL present an `answer` of 400 characters or fewer that leads with the recommended action.
2. WHERE a value in the Gerak_Khas_Response carries `isSimulated = true`, THE Chat_Panel SHALL display the Simulated_Live_Label "SIMULATED LIVE DATA" adjacent to that value as presentation derived from the Is_Simulated flag and the relevant Source_Status, without storing "SIMULATED LIVE DATA" as a Source_Status value.
3. WHERE a fare in the Gerak_Khas_Response carries `sourceStatus = ESTIMATED`, THE Chat_Panel SHALL display the label "ESTIMATED" or "DEMO FARE ESTIMATE" adjacent to that fare.
4. WHERE accessibility or station-facility information in the Gerak_Khas_Response is unverified, THE Chat_Panel SHALL present that information with an explicit statement of uncertainty adjacent to the information.

### Requirement 14: Route Recommendation and Selection Action (Phase 3)

**User Story:** As a passenger, I want to apply a recommended route in one tap, so that the co-pilot changes my actual journey.

#### Acceptance Criteria

1. WHEN the Orchestrator recommends a route, THE Gerak_Khas_Response SHALL include a `routeRecommendation` whose route identifier is a member of the Context_Model alternatives or the Mobility_Tool candidates.
2. WHEN a `routeRecommendation` is present, THE Gerak_Khas_Response SHALL include exactly one SELECT_ROUTE action identifying that route.
3. WHEN the passenger confirms a SELECT_ROUTE action, THE Gerak_Khas SHALL update the GER4K selected route to the referenced route through the existing shared state.
4. THE SELECT_ROUTE action SHALL reference only a route identifier that is currently valid, and SHALL NOT reference a route identifier that is absent from the current Context_Model alternatives and the current Mobility_Tool candidates.
5. IF the referenced route identifier is no longer present in the current Context_Model alternatives when the passenger confirms a SELECT_ROUTE action, THEN THE Gerak_Khas SHALL reject the stale SELECT_ROUTE action, SHALL refresh the current Context_Model, SHALL re-run the relevant ranking or recommendation through the Ranking_Engine or Recovery_Engine, SHALL inform the passenger that the previous route is no longer available, SHALL present the newly valid alternatives, and SHALL NOT change the selected route to a route identifier that is not currently valid.

### Requirement 15: Preference Suggestion Action (Phase 3)

**User Story:** As a passenger, I want the co-pilot to adjust my ranking preference when I ask for a different priority, so that future results match my intent.

#### Acceptance Criteria

1. WHEN the passenger asks for one of the supported Ranking_Engine preference profiles Balanced, Fastest, Cheapest, Least Walking, Fewest Transfers, Avoid Crowding, or Accessible, THE Orchestrator SHALL obtain the re-ranked options from the Ranking_Engine for the corresponding preference.
2. WHEN a preference re-rank is produced, THE Gerak_Khas_Response SHALL include a `suggestedPreference` and exactly one SET_PREFERENCE action for that preference.
3. WHEN the passenger confirms a SET_PREFERENCE action, THE Gerak_Khas SHALL update the GER4K ranking preference through the existing shared state.
4. THE Orchestrator SHALL NOT rank or re-order routes itself and SHALL rely on the Ranking_Engine for all ordering.
5. IF the passenger asks for a ranking priority that is not one of the supported Ranking_Engine preference profiles Balanced, Fastest, Cheapest, Least Walking, Fewest Transfers, Avoid Crowding, and Accessible, THEN THE Gerak_Khas_Response SHALL state that the requested priority is not supported and SHALL NOT include a SET_PREFERENCE action.

### Requirement 16: Deterministic Fallback (Phase 3)

**User Story:** As a passenger, I want useful answers even when the AI service is down, so that the co-pilot still helps me during a demo or an outage.

#### Acceptance Criteria

1. IF the AI provider is unavailable because Bedrock is unreachable, there is no internet, a model invocation fails, credentials are missing, or a quota is exceeded, THEN THE Gerak_Khas SHALL produce a Deterministic_Fallback response from the Mobility_Tools and `answerAsk`.
2. THE Deterministic_Fallback SHALL answer, at minimum, why this route, fastest route, least walking, cheapest, avoid crowding, bus or feeder option, fare, selected station condition, and source status.
3. WHEN a Deterministic_Fallback response is produced, THE Gerak_Khas_Response SHALL set `source` to indicate a non-AI origin.
4. WHEN the AI provider fails during a request, THE Gerak_Khas SHALL return the Deterministic_Fallback response and SHALL NOT return a server error to the passenger.
5. GIVEN identical input and Context_Model, THE Deterministic_Fallback SHALL produce the same Gerak_Khas_Response on repeated requests.

### Requirement 17: Optional AI Explanation Layer (Phase 3)

**User Story:** As a passenger, I want a natural-sounding explanation when AI is available, so that answers read well without losing their factual basis.

#### Acceptance Criteria

1. WHERE the AI provider is configured, THE Orchestrator SHALL invoke the AI_Explanation_Layer to rephrase the lead language of the assembled Gerak_Khas_Response.
2. WHEN the AI_Explanation_Layer returns successfully, THE Gerak_Khas_Response SHALL set `source` to indicate the AI origin.
3. THE AI_Explanation_Layer SHALL run only on the server through the existing Bedrock provider.
4. WHEN the AI_Explanation_Layer changes the lead language, THE Gerak_Khas SHALL keep the evidence, actions, routeRecommendation, suggestedPreference, and labels of the Gerak_Khas_Response unchanged.
5. IF the AI_Explanation_Layer fails, THEN THE Gerak_Khas SHALL return the already-assembled Gerak_Khas_Response with `source` set to a non-AI origin and SHALL NOT return a server error to the passenger.

### Requirement 18: Server-Side AI Security (Phase 3)

**User Story:** As a GER4K operator, I want all AI and image credentials kept on the server, so that no secret is ever exposed to the browser.

#### Acceptance Criteria

1. THE Gerak_Khas SHALL perform all AI provider calls and Image_Provider calls on the server and SHALL NOT perform any provider call from client JavaScript.
2. THE Gerak_Khas SHALL NOT expose AWS access keys, AWS secret keys, Bedrock credentials, or other server secrets through client JavaScript.
3. THE Gerak_Khas SHALL NOT place AWS or AI provider secrets in any `NEXT_PUBLIC_` environment variable.
4. WHEN the Chat_Panel receives a response from a Gerak_Khas server route, THE response SHALL contain only result data, where result data excludes AWS access keys, AWS secret keys, Bedrock credentials, and any other provider credential.
5. IF an assembled client response would otherwise include a provider credential, THEN THE Gerak_Khas server route SHALL omit that credential from the response before returning the response to the client.

### Requirement 19: Bus and Feeder Questions (Phase 2, Phase 3)

**User Story:** As a passenger, I want to ask about Rapid KL buses and MRT feeder buses, so that I know my bus options.

#### Acceptance Criteria

1. WHEN the passenger asks for a bus or feeder option, THE Orchestrator SHALL invoke the BusTool to obtain bus-supported options from the existing Multimodal_Fixture via `provider.getMultimodalNetwork`.
2. WHEN a bus-supported option exists for the current journey, THE Gerak_Khas_Response SHALL present that option clearly identified as bus-supported or feeder-supported, with its travel time in minutes where available, its transfer count as a non-negative integer, and a SHOW_BUS action.
3. WHERE the bus-supported recovery alternative C is present for the Putrajaya Sentral to KLCC journey, THE Gerak_Khas_Response SHALL present alternative C using the structured Multimodal_Fixture data, SHALL include its walking distance in metres where available, SHALL include its estimated demo fare with `sourceStatus = ESTIMATED` where available, SHALL include simulated arrival information from `simulatedNextArrivalMin` where available, and SHALL include a SELECT_ROUTE action identifying alternative C when alternative C is a currently valid candidate.
4. WHERE a presented bus option or alternative C uses a simulated service, THE Gerak_Khas_Response SHALL carry `isSimulated = true` for that option and THE Chat_Panel SHALL display the Simulated_Live_Label "SIMULATED LIVE DATA" adjacent to that option.
5. THE BusTool SHALL NOT introduce a real service number that is not verified, where Rapid KL bus 300 is GTFS-verified and the Replacement bus is a labelled simulated demo fixture.
6. IF no bus or feeder option exists for the current journey, THEN THE Gerak_Khas_Response SHALL state that no bus option is available for that journey.
7. IF the BusTool fails to obtain bus options, THEN THE Gerak_Khas_Response SHALL state that bus options cannot be retrieved for that journey.

### Requirement 20: Fare Questions (Phase 2, Phase 3)

**User Story:** As a passenger, I want to ask what a journey costs, so that I can plan my spending.

#### Acceptance Criteria

1. WHEN the passenger asks about fare or cost, THE Orchestrator SHALL invoke the FareTool to obtain the fare estimate from the existing Fare_Engine.
2. WHEN a fare estimate is produced, THE Gerak_Khas_Response SHALL present the total fare in RM to two decimal places and SHALL label the fare as an estimate.
3. IF the required fare inputs are unavailable, THEN THE Gerak_Khas_Response SHALL state that it cannot estimate the fare for that journey and SHALL identify which fare input is missing.
4. IF the FareTool or the Fare_Engine fails to produce a fare estimate, THEN THE Gerak_Khas_Response SHALL state that the fare cannot be estimated for that journey.

### Requirement 21: Walking and Interchange Questions (Phase 2, Phase 3)

**User Story:** As a passenger, I want to ask about walking and interchange distances, so that I can choose a route with manageable walking.

#### Acceptance Criteria

1. WHEN the passenger asks about walking distance or pedestrian connections, THE Orchestrator SHALL invoke the WalkingTool to obtain walking information from the existing domain data.
2. WHEN walking information is produced, THE Gerak_Khas_Response SHALL present the total walking distance for the relevant option in metres.
3. WHEN the passenger asks for less walking on the current journey AND two or more options with differing walking distances exist, THE Gerak_Khas_Response SHALL recommend the option with the lowest walking distance with a walking comparison and a SELECT_ROUTE action.
4. IF the passenger asks for less walking and no option has a lower walking distance than the currently selected route, THEN THE Gerak_Khas_Response SHALL state that no lower-walking option is available for that journey.

### Requirement 22: Crowding and Station Pulse Questions (Phase 2, Phase 3)

**User Story:** As a passenger, I want to ask how crowded a station is, so that I can avoid packed stations.

#### Acceptance Criteria

1. WHEN the passenger asks about crowding or station condition, THE Orchestrator SHALL invoke the PulseTool, which SHALL call the existing Pulse_Aggregator and SHALL NOT implement its own aggregation.
2. THE PulseTool SHALL rely on the existing Pulse_Aggregator aggregation, which uses a 30-minute recent window and gives reports within the most recent 10 minutes double recency weight, and SHALL NOT redefine the recent window to 60 minutes.
3. WHEN a Station Pulse summary is available for the referenced station, THE Gerak_Khas_Response SHALL present the station condition, the count of reports from the 30-minute recent window as a non-negative integer, and an OPEN_STATION or OPEN_PULSE action.
4. IF no reports exist for the referenced station within the 30-minute recent window, THEN THE Gerak_Khas_Response SHALL state that there are no recent reports for that station.
5. IF the referenced station is not recognised in the existing domain data, THEN THE Gerak_Khas_Response SHALL state that the station is not recognised.
6. WHERE a presented Station Pulse summary carries `isSimulated = true` from seeded demo reports, THE Chat_Panel SHALL display the Simulated_Live_Label "SIMULATED LIVE DATA" adjacent to the data.
7. WHERE a presentation window different from the 30-minute recent window is desired, THE Gerak_Khas SHALL treat that window as a presentation concern only and SHALL NOT change the Pulse_Aggregator aggregation algorithm.

### Requirement 23: Service Status Questions (Phase 2, Phase 3)

**User Story:** As a passenger, I want to ask about line service status, so that I know whether a line is disrupted.

#### Acceptance Criteria

1. WHEN the passenger asks about service or line status, THE Orchestrator SHALL invoke the ServiceStatusTool to obtain line statuses from the existing domain data.
2. WHEN line status is available, THE Gerak_Khas_Response SHALL present the line identifier together with the status value and a SHOW_SERVICE action.
3. IF no line status is available for the referenced line, THEN THE Gerak_Khas_Response SHALL state that no service status is available for that line.
4. WHERE a presented line status carries `isSimulated = true` from a simulated disruption, THE Gerak_Khas_Response SHALL carry the real `sourceStatus` value and the separate `isSimulated` flag for that status, and THE Chat_Panel SHALL display the Simulated_Live_Label "SIMULATED LIVE DATA" adjacent to that status.

### Requirement 24: Accessibility and Mobility-Need Questions (Phase 2, Phase 3)

**User Story:** As a passenger with mobility needs, I want honest accessibility guidance, so that I am not misled about facilities the app cannot verify.

#### Acceptance Criteria

1. WHEN the passenger asks about accessibility or mobility needs, THE Orchestrator SHALL invoke the AccessibilityTool, which SHALL be backed by the new Accessibility_Uncertainty_Model because no per-station accessibility or facility dataset exists in the repo.
2. WHEN the passenger asks about accessibility or mobility needs, THE AccessibilityTool SHALL surface the Accessible ranking preference and SHALL NOT claim an existing accessibility engine or a verified accessibility dataset.
3. THE AccessibilityTool SHALL report by default that verified lift, escalator, and facility status is not available, and SHALL advise checking signage at the station.
4. WHEN the AccessibilityTool returns accessibility information, THE Gerak_Khas_Response SHALL present that information with the explicit statement that the information is unverified.
5. IF the referenced station is not recognised in the existing domain data, THEN THE Gerak_Khas_Response SHALL state that the station is not recognised.

### Requirement 25: Historical Demand Questions (Phase 2, Phase 3)

**User Story:** As a passenger, I want to ask how busy a station usually is, so that I can plan around typical demand.

#### Acceptance Criteria

1. WHEN the passenger asks about typical or historical station demand, THE Orchestrator SHALL invoke the HistoricalDemandTool to obtain the historical demand record from the existing dataset.
2. WHEN a historical demand record is available, THE Gerak_Khas_Response SHALL present the demand band, and THE Chat_Panel SHALL display a visible "historical data" label adjacent to the demand band.
3. IF no historical demand record exists for the referenced station, THEN THE Gerak_Khas_Response SHALL state that it has no historical demand data for that station.

### Requirement 26: Honest Uncertainty for Unsupported Facts (Phase 3)

**User Story:** As a passenger, I want the co-pilot to admit when it does not know, so that I never receive invented facts.

#### Acceptance Criteria

1. IF the passenger asks for a transport fact that no Mobility_Tool can support with structured data, THEN THE Gerak_Khas_Response SHALL state that reliable information is not available for that question.
2. THE Gerak_Khas SHALL NOT present an AI-generated transport fact as if it came from structured GER4K data.
3. WHEN Gerak_Khas returns an honest-uncertainty response, THE Gerak_Khas_Response SHALL record the uncertainty in its `warnings` field.
4. IF a Mobility_Tool returns no structured data for a question, THEN THE Gerak_Khas SHALL NOT substitute AI-generated content for the missing structured data.

### Requirement 27: Visual Capability Modes (Phase 4)

**User Story:** As a passenger, I want to see station visuals clearly labelled as real or illustrated, so that I am never misled about what a station looks like.

#### Acceptance Criteria

1. WHEN the passenger asks to recognise a real station and a curated station image exists in the Station_Image_Reference_Model, THE VisualTool SHALL return that image labelled "REAL REFERENCE PHOTO" with its required source metadata.
2. THE VisualTool SHALL use only images intentionally included and approved for GER4K in the Station_Image_Reference_Model, and SHALL NOT scrape or present an arbitrary internet image as an authoritative station reference without source information.
3. WHERE a curated factual station image exists, THE Gerak_Khas SHALL return that factual reference photo and SHALL NOT substitute a generated illustration.
4. WHEN the passenger explicitly requests a generated visual, THE VisualTool SHALL request an AI-generated illustration.
5. WHERE no curated factual image exists and the passenger chooses an illustration, THE VisualTool SHALL request an AI-generated illustration.
6. WHEN an AI-generated illustration is displayed, THE Chat_Panel SHALL display the visible label "AI-GENERATED ILLUSTRATION / NOT AN ACTUAL STATION PHOTO" adjacent to that illustration.
7. THE Gerak_Khas SHALL present a generated illustration as an approximation and SHALL state that the illustration architecture may differ from the real station.
8. THE VisualTool result SHALL carry a `sourceStatus` value and a separate `isSimulated` flag and SHALL NOT collapse the two axes into one.
9. THE VisualTool SHALL define the Image_Provider behind an interface that allows one Image_Provider implementation to be replaced by another without changing the VisualTool callers.

### Requirement 28: Server-Side Image Generation (Phase 4)

**User Story:** As a GER4K operator, I want image generation handled on the server, so that provider credentials stay protected.

#### Acceptance Criteria

1. WHEN an AI-generated illustration is required, THE Gerak_Khas SHALL request the illustration through a server-side Gerak_Khas image API route.
2. THE Gerak_Khas image API route SHALL invoke the configured Image_Provider on the server and SHALL return the generated image result to the client with all provider credentials excluded.
3. WHERE the Image_Provider is AWS Bedrock, THE Gerak_Khas SHALL keep all AWS access on the server and SHALL NOT expose AWS credentials to the client.

### Requirement 29: Image Generation Graceful Fallback (Phase 4)

**User Story:** As a passenger, I want the app to keep working when an image cannot be generated, so that a visual failure never blocks my journey.

#### Acceptance Criteria

1. IF image generation fails or does not complete within 15 seconds, THEN THE Gerak_Khas SHALL display the message "I couldn't generate the illustration right now, but I can still show the station information I have."
2. WHEN image generation fails or does not complete within 15 seconds, THE Gerak_Khas SHALL still return the available structured station information in the Gerak_Khas_Response.
3. THE Gerak_Khas SHALL treat image generation as non-critical and SHALL complete journey planning and disruption recovery without a successful image generation.

### Requirement 30: Focused Automated Tests (All Phases)

**User Story:** As a developer, I want focused tests for Gerak Khas behaviour, so that the co-pilot is reliable and the existing GER4K tests keep passing.

#### Acceptance Criteria

1. THE Gerak_Khas SHALL include at least one automated test for each of intent and tool routing, Deterministic_Fallback, current-journey context resolution, bus questions, fare questions, walking questions, crowding questions, accessibility uncertainty, unsupported-fact honest uncertainty, route-action valid selection, generated-image labelling, image-provider failure fallback, and separate source and simulation labelling.
2. THE route-action test SHALL fail if a SELECT_ROUTE action references a route identifier that is absent from the Context_Model alternatives and the Mobility_Tool candidates.
3. THE separate-labelling test SHALL fail if a Gerak_Khas_Response, Mobility_Tool output, or evidence item represents `sourceStatus` and `isSimulated` as a single collapsed value rather than as two separate fields.
4. THE generated-image test SHALL fail if a generated image is labelled as a real photo.
5. THE image-provider failure test SHALL fail if Gerak_Khas omits the structured station information when image generation fails.
6. WHEN the Gerak_Khas test suite and the existing GER4K test suite run together, THE combined suite SHALL pass with zero failing tests.

### Requirement 31: Demo Data Consistency (All Phases)

**User Story:** As a demo presenter, I want the co-pilot to use the established demo scenario, so that its answers match the rest of GER4K.

#### Acceptance Criteria

1. THE Gerak_Khas SHALL use the main demo journey Putrajaya Sentral to KLCC from the existing structured data.
2. THE Gerak_Khas SHALL use the main simulated disruption on the segment TRX to Conlay from the existing structured data.
3. THE Gerak_Khas SHALL use the existing recovery alternative A via Putrajaya Sentral to TRX to Pasar Seni to KLCC and the existing recovery alternative B via Putrajaya Sentral to Chan Sow Lin to Masjid Jamek to KLCC.
4. THE Gerak_Khas SHALL support the approved third recovery alternative C, a feeder-supported or bus-supported recovery backed by the existing Multimodal_Fixture, and alternative C SHALL NOT replace alternative A or alternative B.
5. THE Gerak_Khas SHALL NOT introduce route values, station names, or disruption segments that conflict with the existing structured demo data, including alternative A, alternative B, and alternative C.
