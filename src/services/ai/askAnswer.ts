/**
 * Ask GER4K co-pilot — deterministic intents and structured answers
 * (Requirement 31). PURE and framework-free: it imports no React/Next, no AI SDK
 * and nothing `server-only`, so the `/api/ask` handler uses it AND the client
 * uses it as an offline fallback when `/api/ask` is unreachable.
 *
 * Boundaries (Requirements 10.2, 16.4, 31.3, 31.5):
 *  - Natural language is mapped to an INTENT by keyword rules — never by AI.
 *  - Profile intents ask the CORE Ranking_Engine (`rankAlternatives`) to
 *    re-rank the options the domain already built. Nothing here computes a
 *    route, a fare or a confidence score — all of those arrive in the request.
 *  - Option intents ("avoid TRX", "bus option") FILTER domain-built options by
 *    their touch stations / bus legs, then let the CORE ranking pick the best.
 *  - The AI provider may only rephrase `lead`; structure and suggestion are
 *    always these deterministic results.
 */

import type {
  AiExplanationOption,
  AiExplanationRequest,
  AskStationContext,
} from "./AiProvider";
import type { Journey, PreferenceProfile } from "@/types";
import { rankAlternatives } from "@/domain/recovery";
import { bandLabel, bandMeaning, describeFactors } from "@/domain/confidence";

// ── Types ──────────────────────────────────────────────────────────────────

export type AskIntent =
  | "why_route"
  | "why_confidence"
  | "avoid_station"
  | "cheapest"
  | "bus_option"
  | "less_walking"
  | "accessible"
  | "avoid_crowds"
  | "fastest"
  | "fewest_changes"
  | "station_status";

export interface AskSuggestion {
  optionId: string;
  title: string;
  timeMin: number;
  fareSen?: number;
  transfers: number;
  walkMeters: number;
  isSimulated?: boolean;
}

export interface AskAnswer {
  intent: AskIntent;
  title: string;
  lead: string;
  bullets: string[];
  metrics?: { timeMin: number; fareSen?: number; transfers: number; walkMeters: number };
  /** A different option the passenger can switch to in one tap. */
  suggestion?: AskSuggestion;
  followUps: { label: string; question: string }[];
  /** The profile this answer applies, when a profile intent re-ranked. */
  profile?: PreferenceProfile;
  stationId?: string;
}

export interface AskReranked {
  profile: PreferenceProfile;
  recommendedId: string;
  order: string[];
}

/** Response of the co-pilot pipeline (and of `/api/ask`). */
export interface AskResponse {
  text: string;
  highlights?: string[];
  source: "bedrock" | "fallback";
  reranked?: AskReranked;
  answer: AskAnswer;
}

// ── Intent mapping ─────────────────────────────────────────────────────────

const PROFILE_FOR_INTENT: Partial<Record<AskIntent, PreferenceProfile>> = {
  cheapest: "Cheapest",
  less_walking: "Least Walking",
  accessible: "Accessible",
  avoid_crowds: "Avoid Crowding",
  fastest: "Fastest",
  fewest_changes: "Fewest Transfers",
};

/** Find a station mentioned in the question (longest name first). */
function mentionedStation(
  question: string,
  stations: ReadonlyArray<AskStationContext>,
): AskStationContext | undefined {
  const q = question.toLowerCase();
  const sorted = [...stations].sort((a, b) => b.name.length - a.name.length);
  return sorted.find((s) => {
    const n = s.name.toLowerCase();
    return new RegExp(`(^|[^a-z])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(q);
  });
}

/**
 * Map a free-text question to an intent (deterministic keyword rules; first
 * match wins). Exported for tests and the UI's follow-up chips.
 */
export function mapQuestionToIntent(
  question: string | undefined,
  stations: ReadonlyArray<AskStationContext> = [],
): { intent: AskIntent; stationId?: string } {
  const q = (question ?? "").toLowerCase().trim();
  if (!q) return { intent: "why_route" };
  const station = mentionedStation(q, stations);

  if (station && /(happening|going on|status|how busy|how is|what'?s up|condition|crowded|packed|busy|full|\bat\s)/.test(q) && !/(avoid|skip|without|not via|instead|don'?t want)/.test(q)) {
    return { intent: "station_status", stationId: station.stationId };
  }
  if (station && /(avoid|skip|without|not (via|through)|instead of|other than|don'?t want)/.test(q)) {
    return { intent: "avoid_station", stationId: station.stationId };
  }
  if (/(grand(mother|ma|father|pa|parent)|elderly|older (person|people|folks)|wheelchair|stroller|pram|stairs|disab|\boku\b|mobility|luggage|injur|crutch|pregnan|accessib|easier)/.test(q)) {
    return { intent: "accessible" };
  }
  if (/(crowd|packed|squeez|sardine|busy station|full train|quiet)/.test(q)) {
    return { intent: "avoid_crowds" };
  }
  if (/(budget|cheap|cost|price|fare|save money|afford|less money|ringgit|\brm\b)/.test(q)) {
    return { intent: "cheapest" };
  }
  if (/(\bbus\b|buses|feeder|shuttle)/.test(q)) {
    return { intent: "bus_option" };
  }
  if (/(hate|less|least|avoid|minim\w*|no|without|reduce)\s+walk|walk(ing)?\s+(less|least)|don'?t\s+(want\s+to\s+)?walk|too\s+much\s+walk|less walking|least walking/.test(q)) {
    return { intent: "less_walking" };
  }
  if (/(few\w*|less|least|minim\w*|no|avoid)\s+(transfer|change|interchange)s?|without\s+(transfer|chang)|direct/.test(q)) {
    return { intent: "fewest_changes" };
  }
  if (/(fast\w*|quick\w*|speed\w*|hurry|late|asap|shortest\s+time|get\s+there\s+(fast|quick))/.test(q)) {
    return { intent: "fastest" };
  }
  if (/(confiden|reliab|sure|trust|certain|accurate)/.test(q)) {
    return { intent: "why_confidence" };
  }
  return { intent: "why_route" };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toJourney(o: AiExplanationOption): Journey {
  return {
    id: o.id,
    legs: [],
    totalTimeMin: o.travelTimeMin,
    transfers: o.transfers,
    totalWalkMeters: o.totalWalkMeters,
    ...(o.fareSen !== undefined ? { fareSen: o.fareSen } : {}),
    ...(o.crowdLevel !== undefined ? { crowdLevel: o.crowdLevel } : {}),
    ...(o.accessIssues !== undefined ? { accessIssues: o.accessIssues } : {}),
    sourceStatus: "UNVERIFIED",
    isSimulated: false,
  };
}

/** Rank options with the CORE Ranking_Engine and return them in order. */
function rankOptions(
  options: ReadonlyArray<AiExplanationOption>,
  profile: PreferenceProfile,
): AiExplanationOption[] {
  const byId = new Map(options.map((o) => [o.id, o]));
  return rankAlternatives(options.map(toJourney), profile)
    .map((j) => byId.get(j.id))
    .filter((o): o is AiExplanationOption => !!o);
}

/** Capitalise the first letter (titles like "via TRX" start sentences). */
function cap(text: string): string {
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
}

function nameOf(o: AiExplanationOption): string {
  return o.title ?? o.label;
}

function rm(sen: number | undefined): string | null {
  return sen === undefined ? null : `RM${(sen / 100).toFixed(2)}`;
}

function changes(n: number): string {
  return n === 0 ? "no changes" : `${n} change${n === 1 ? "" : "s"}`;
}

function metricsOf(o: AiExplanationOption): AskAnswer["metrics"] {
  return {
    timeMin: o.travelTimeMin,
    ...(o.fareSen !== undefined ? { fareSen: o.fareSen } : {}),
    transfers: o.transfers,
    walkMeters: o.totalWalkMeters,
  };
}

function suggestionOf(o: AiExplanationOption): AskSuggestion {
  return {
    optionId: o.id,
    title: nameOf(o),
    timeMin: o.travelTimeMin,
    ...(o.fareSen !== undefined ? { fareSen: o.fareSen } : {}),
    transfers: o.transfers,
    walkMeters: o.totalWalkMeters,
    ...(o.isSimulated ? { isSimulated: true } : {}),
  };
}

function metricLine(o: AiExplanationOption): string {
  const fare = rm(o.fareSen);
  return [`${o.travelTimeMin} min`, fare, changes(o.transfers), `${o.totalWalkMeters} m walking`]
    .filter(Boolean)
    .join(" · ");
}

function stationNameFor(id: string, stations: ReadonlyArray<AskStationContext>): string {
  return stations.find((s) => s.stationId === id)?.name ?? id;
}

function crowdedTouch(
  o: AiExplanationOption,
  stations: ReadonlyArray<AskStationContext>,
): AskStationContext | undefined {
  return (o.touchStationIds ?? [])
    .map((id) => stations.find((s) => s.stationId === id))
    .find((s) => s && (s.condition === "Packed" || s.condition === "Severe disruption") && s.reportCount > 0);
}

const FOLLOW_EASIER = [
  { label: "Less walking", question: "Which route has less walking?" },
  { label: "Avoid crowds", question: "I don't want packed stations" },
];

function timeDiffText(a: AiExplanationOption, b: AiExplanationOption): string {
  const d = b.travelTimeMin - a.travelTimeMin;
  if (d > 0) return `about ${d} minute${d === 1 ? "" : "s"} sooner than ${nameOf(b)}`;
  if (d < 0) return `${-d} minute${d === -1 ? "" : "s"} slower than ${nameOf(b)}, but easier`;
  return `in the same time as ${nameOf(b)}`;
}

// ── Answer builders ────────────────────────────────────────────────────────

function answerWhyRoute(req: AiExplanationRequest): AskAnswer {
  const stations = req.stations ?? [];
  const all = req.alternatives;
  const focus = all.find((o) => o.id === req.focusedOptionId) ?? req.recommended;
  const isTop = focus.id === all[0]?.id;
  const runnerUp = all.find((o) => o.id !== focus.id);
  const dest = req.destinationName ?? "your destination";
  const recovery = req.mode === "recovery";
  const strategy = (focus.strategies ?? [])[0];

  const what = strategy
    ? `${strategy.toLowerCase()} ${recovery ? "recovery" : "route"}`
    : isTop
      ? `best ${recovery ? "recovery" : "route"} for your ${req.profile} priority`
      : `an alternative ${recovery ? "recovery" : "route"}`;
  const title = cap(`${nameOf(focus)} is your ${what}`);

  const crowded = crowdedTouch(focus, stations);
  let lead: string;
  if (runnerUp) {
    const diff = timeDiffText(focus, runnerUp);
    lead = crowded
      ? `${crowded.name} is crowded, but this route still gets you to ${dest} ${diff}.`
      : `It gets you to ${dest} ${diff}.`;
  } else {
    lead = `It is the only route GER4K found to ${dest} right now.`;
  }

  const bullets = [metricLine(focus), `${bandLabel(focus.confidenceBand)} — ${bandMeaning(focus.confidenceBand)}`];
  if (focus.isSimulated) bullets.push("Uses a simulated service from the demo scenario.");

  return {
    intent: "why_route",
    title,
    lead,
    bullets,
    metrics: metricsOf(focus),
    followUps: recovery
      ? [...FOLLOW_EASIER, { label: "Cheaper?", question: "Which option is cheaper?" }]
      : [{ label: "Fewer changes", question: "Can I have fewer changes?" }, { label: "Cheaper?", question: "Which option is cheaper?" }],
  };
}

function answerWhyConfidence(req: AiExplanationRequest): AskAnswer {
  const focus = req.alternatives.find((o) => o.id === req.focusedOptionId) ?? req.recommended;
  const factors = focus.confidenceFactors ?? (focus.id === req.recommended.id ? req.confidenceFactors : []);
  const sentences = describeFactors(factors).slice(0, 4);
  return {
    intent: "why_confidence",
    title: bandLabel(focus.confidenceBand),
    lead: `${bandMeaning(focus.confidenceBand)} It is a reliability indicator, not a guarantee.`,
    bullets: sentences.map((s) => (s.tone === "good" ? `✓ ${s.text}` : `! ${s.text}`)),
    metrics: metricsOf(focus),
    followUps: [{ label: "Why this route?", question: "Why this route?" }],
  };
}

function answerProfile(
  req: AiExplanationRequest,
  intent: AskIntent,
  profile: PreferenceProfile,
  previous: AiExplanationOption,
): AskAnswer {
  const stations = req.stations ?? [];
  const top = req.recommended;
  const changed = top.id !== previous.id;
  const bullets: string[] = [metricLine(top)];

  if (intent === "cheapest" && top.fareSen !== undefined && previous.fareSen !== undefined && changed) {
    const saving = previous.fareSen - top.fareSen;
    if (saving > 0) bullets.push(`RM${(saving / 100).toFixed(2)} less than ${nameOf(previous)} (demo fare estimate).`);
  }
  if (intent === "less_walking" && changed) {
    const less = previous.totalWalkMeters - top.totalWalkMeters;
    if (less > 0) bullets.push(`${less} m less walking than ${nameOf(previous)}.`);
  }
  if (intent === "accessible") {
    const touch = (top.touchStationIds ?? []).map((id) => stations.find((s) => s.stationId === id)).filter(Boolean) as AskStationContext[];
    if (touch.length > 0 && touch.every((s) => s.isOKU)) {
      bullets.push("Every station where you change is flagged OKU-friendly in official GTFS data.");
    }
    bullets.push("GER4K has no live lift or escalator status — check signage at each station.");
  }
  if (intent === "avoid_crowds") {
    const crowded = crowdedTouch(top, stations);
    bullets.push(
      crowded
        ? `${crowded.name} is still reported crowded on every option.`
        : "Avoids the stations commuters are reporting as packed.",
    );
  }
  if (top.isSimulated) bullets.push("Uses a simulated replacement bus — part of the demo scenario.");

  return {
    intent,
    profile,
    title: changed ? "Got it." : cap(`${nameOf(top)} already fits`),
    lead: changed
      ? `I've switched your recommendation to ${nameOf(top)}.`
      : cap(`${nameOf(top)} is already the best match for "${profile}".`),
    bullets,
    metrics: metricsOf(top),
    ...(changed ? { suggestion: suggestionOf(top) } : {}),
    followUps:
      intent === "fastest"
        ? FOLLOW_EASIER
        : [{ label: "Fastest instead", question: "What's the fastest option?" }, { label: "Why this route?", question: "Why this route?" }],
  };
}

function answerAvoidStation(req: AiExplanationRequest, stationId: string): AskAnswer {
  const stations = req.stations ?? [];
  const name = stationNameFor(stationId, stations);
  const pool = [...req.alternatives, ...(req.candidates ?? [])];
  const avoiding = pool.filter((o) => !(o.touchStationIds ?? []).includes(stationId));
  const best = rankOptions(avoiding, req.profile)[0];
  const current = req.recommended;

  if (!best) {
    return {
      intent: "avoid_station",
      stationId,
      title: `Every option changes at ${name} right now`,
      lead: `${nameOf(current)} is still the quickest way through.`,
      bullets: [metricLine(current)],
      metrics: metricsOf(current),
      followUps: [{ label: `What's happening at ${name}?`, question: `What is happening at ${name}?` }],
    };
  }

  const passesThrough = (best.pathStationIds ?? []).includes(stationId);
  const extra = best.travelTimeMin - current.travelTimeMin;
  const bullets = [metricLine(best)];
  if (passesThrough) bullets.push(`Your train still passes through ${name}, but you won't need to get off there.`);
  if (best.isSimulated) bullets.push("Uses a simulated service from the demo scenario.");

  return {
    intent: "avoid_station",
    stationId,
    title: `Yes — skip changing at ${name}`,
    lead:
      best.id === current.id
        ? cap(`${nameOf(best)} already avoids changing at ${name}.`)
        : `${cap(nameOf(best))} avoids ${name}. ${extra > 0 ? `It takes ${extra} minute${extra === 1 ? "" : "s"} longer.` : extra < 0 ? `It is ${-extra} minutes quicker.` : "It takes the same time."}`,
    bullets,
    metrics: metricsOf(best),
    ...(best.id !== current.id ? { suggestion: suggestionOf(best) } : {}),
    followUps: [{ label: "Why this route?", question: "Why this route?" }, ...FOLLOW_EASIER.slice(0, 1)],
  };
}

function answerBus(req: AiExplanationRequest): AskAnswer {
  const presented = req.alternatives.filter((o) => o.hasBus);
  const hidden = (req.candidates ?? []).filter((o) => o.hasBus);
  const best = rankOptions(presented, req.profile)[0] ?? rankOptions(hidden, req.profile)[0];
  const current = req.recommended;

  if (!best) {
    return {
      intent: "bus_option",
      title: "No bus option on this journey right now",
      lead: `Rail is the most practical way to ${req.destinationName ?? "your destination"} at the moment.`,
      bullets: [metricLine(current)],
      metrics: metricsOf(current),
      followUps: [{ label: "Why this route?", question: "Why this route?" }],
    };
  }

  const isPresented = presented.some((o) => o.id === best.id);
  const diff = best.travelTimeMin - current.travelTimeMin;
  const bullets = [metricLine(best)];
  if (best.isSimulated) bullets.push("The replacement bus is part of the simulated demo scenario.");
  if (!isPresented) {
    bullets.push(`GER4K doesn't list it as a top option because ${nameOf(current)} is as fast or faster with less walking.`);
  }
  // Mention a second bus option if one exists.
  const other = [...presented, ...hidden].find((o) => o.id !== best.id);
  if (other) bullets.push(`Also possible: ${nameOf(other)} (${other.travelTimeMin} min).`);

  return {
    intent: "bus_option",
    title: `Yes — ${nameOf(best)}`,
    lead:
      diff === 0
        ? `It takes the same time as ${nameOf(current)}.`
        : diff > 0
          ? `It takes ${diff} minute${diff === 1 ? "" : "s"} longer than ${nameOf(current)}.`
          : `It is ${-diff} minutes quicker than ${nameOf(current)}.`,
    bullets: bullets.slice(0, 4),
    metrics: metricsOf(best),
    ...(best.id !== current.id ? { suggestion: suggestionOf(best) } : {}),
    followUps: [{ label: "Cheapest?", question: "Which option is cheaper?" }],
  };
}

function freshnessText(min: number | null): string {
  if (min === null) return "no recent reports";
  if (min <= 1) return "updated just now";
  return `updated ${min} min ago`;
}

function answerStation(req: AiExplanationRequest, stationId: string): AskAnswer {
  const s = (req.stations ?? []).find((x) => x.stationId === stationId);
  if (!s) {
    return {
      intent: "station_status",
      stationId,
      title: "No station information",
      lead: "GER4K has no recent reports for that station.",
      bullets: [],
      followUps: [],
    };
  }
  const condition = s.reportCount === 0 ? "No recent reports" : s.condition;
  const sentence =
    s.reportCount === 0
      ? "No commuter reports in the last 30 minutes."
      : s.condition === "Packed"
        ? "Crowding is high right now."
        : s.condition === "Busy"
          ? "Busier than usual, but moving."
          : s.condition === "Severe disruption"
            ? "Commuters report trains not running here."
            : "Conditions look normal.";
  const bullets = [
    `${s.reportCount} recent report${s.reportCount === 1 ? "" : "s"} · ${freshnessText(s.freshnessMin)} · ${bandLabel(s.band)}`,
  ];
  if (s.trend === "rising") bullets.push("Crowding is increasing.");
  if (s.trend === "easing") bullets.push("Crowding is easing.");
  for (const sig of s.signals.slice(0, 2)) bullets.push(`Reported: ${sig}`);
  if (s.demandBand === "HIGH") bullets.push("Historically one of the busiest stations on the network (historical data).");
  if (s.isSimulated) bullets.push("Includes seeded demo reports.");

  const touchesIt = (req.recommended.touchStationIds ?? []).includes(stationId);
  return {
    intent: "station_status",
    stationId,
    title: `${s.name}: ${condition}`,
    lead: sentence,
    bullets,
    followUps: touchesIt ? [{ label: `Avoid ${s.name}`, question: `Can I avoid ${s.name}?` }] : [],
  };
}

// ── Pipeline ───────────────────────────────────────────────────────────────

/** Apply a domain re-rank to the request (new order, new recommended). */
function applyOrder(req: AiExplanationRequest, order: AiExplanationOption[]): AiExplanationRequest {
  const reranked = order.map((o, i) => ({ ...o, rank: i + 1 }));
  return { ...req, alternatives: reranked, recommended: reranked[0] ?? req.recommended };
}

/** Compact facts for the AI provider to rephrase (never extend). */
function factsFor(answer: AskAnswer): string {
  return [answer.title, answer.lead, ...answer.bullets].join("\n");
}

/**
 * The full deterministic co-pilot pipeline: intent → (domain re-rank) →
 * structured answer. Same input → same output. Used by `/api/ask` and as the
 * client-side offline fallback.
 */
export function answerAsk(req: AiExplanationRequest): AskResponse & {
  effectiveRequest: AiExplanationRequest;
  facts: string;
} {
  const { intent, stationId } = mapQuestionToIntent(req.question, req.stations ?? []);
  const previous = req.recommended;
  let effective = req;
  let reranked: AskReranked | undefined;

  const profile = PROFILE_FOR_INTENT[intent];
  if (profile) {
    const order = rankOptions(req.alternatives, profile);
    effective = { ...applyOrder(req, order), profile };
    if (profile !== req.profile) {
      reranked = {
        profile,
        recommendedId: effective.recommended.id,
        order: order.map((o) => o.id),
      };
    }
  }

  let answer: AskAnswer;
  switch (intent) {
    case "why_confidence":
      answer = answerWhyConfidence(effective);
      break;
    case "avoid_station":
      answer = answerAvoidStation(effective, stationId as string);
      break;
    case "bus_option":
      answer = answerBus(effective);
      break;
    case "station_status":
      answer = answerStation(effective, stationId as string);
      break;
    case "why_route":
      answer = answerWhyRoute(effective);
      break;
    default:
      answer = answerProfile(effective, intent, profile as PreferenceProfile, previous);
  }

  return {
    text: answer.lead,
    highlights: answer.bullets,
    source: "fallback",
    ...(reranked ? { reranked } : {}),
    answer,
    effectiveRequest: effective,
    facts: factsFor(answer),
  };
}
