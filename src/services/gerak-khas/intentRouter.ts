/**
 * Gerak Khas intent + constraint router (Requirement 11).
 *
 * DETERMINISTIC and framework-free. Given the question text and the stations
 * known in context, it returns exactly one PRIMARY intent, any SECONDARY
 * intents, a small ConstraintSet, an implied ranking preference, a named
 * station (if any), and the FIXED, FINITE tool set to call. No AI, no
 * recursion, no autonomous loop. Same input -> same routing.
 */
import type { AskStationContext } from "@/services/ai";
import type { PreferenceProfile } from "@/types";
import type {
  ConstraintSet,
  GerakKhasIntent,
  MobilityToolName,
  RoutedIntent,
} from "./types";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Longest-name-first station mention detection (mirrors askAnswer). */
function mentionedStation(
  q: string,
  stations: ReadonlyArray<AskStationContext>,
): AskStationContext | undefined {
  const sorted = [...stations].sort((a, b) => b.name.length - a.name.length);
  return sorted.find((s) =>
    new RegExp(`(^|[^a-z])${escapeRe(s.name.toLowerCase())}([^a-z]|$)`).test(q),
  );
}

const AVOID_RE = /(avoid|skip|without|not (via|through)|instead of|other than|don'?t want)/;
const BUS_RE = /(\bbus\b|buses|feeder|shuttle|replacement bus)/;
const FARE_RE = /(budget|cheap|cost|price|fare|save money|afford|less money|ringgit|\brm\b)/;
const WALK_RE = /(walk|walking|far to walk|how far)/;
const LESS_WALK_RE = /(less|least|minim\w*|reduce|avoid|no|short\w*).{0,12}walk|walk\w*\s+(less|least)|don'?t\s+walk/;
const CROWD_RE = /(crowd|packed|busy|full|squeez|sardine|quiet|how busy)/;
const ACCESS_RE = /(grand(mother|ma|father|pa|parent)|elderly|older|wheelchair|stroller|pram|stairs|disab|\boku\b|mobility|luggage|injur|crutch|pregnan|accessib|easier|easiest)/;
const SERVICE_RE = /(service status|line status|disrupt|is the .*line|which lines|running)/;
const DEMAND_RE = /(historical|typical|usually busy|normally busy|how busy is .* usually|average)/;
const VISUAL_RE = /(look like|how does .* look|photo|picture|image|show me .*station|illustration|generate)/;
const LINE_RE = /(what line|which line|what lines|which lines|on what line)/;
const LIVE_RE = /(is (this|that) (info|information|data)? ?live|real[- ]?time|up to date|how (fresh|recent)|simulated)/;
const WHY_RE = /(why (this|that)|why are you|why did you|reason|recommend)/;
const WHICH_RE = /(which|what)\s+(route|option|way|one|train)|recommend|best (route|option|way)|should i (take|use)|anything (with|that)/;
const CHEAPEST_RE = /(cheap|budget|afford|save money|less money|lowest fare)/;
const FASTEST_RE = /(fast\w*|quick\w*|speed\w*|hurry|asap|shortest time|soonest)/;
const FEWEST_RE = /(few\w*|less|least|no|avoid)\s+(transfer|change|interchange)|direct/;

export function routeQuestion(
  question: string,
  stations: ReadonlyArray<AskStationContext> = [],
): RoutedIntent {
  const q = (question ?? "").toLowerCase().trim();
  const station = mentionedStation(q, stations);
  const stationId = station?.stationId ?? null;

  const constraints: ConstraintSet = {
    excludeStationIds: station && AVOID_RE.test(q) ? [station.stationId] : [],
    requireBus: BUS_RE.test(q),
    requireAccessiblePreference: ACCESS_RE.test(q),
  };

  let preference: PreferenceProfile | null = null;
  if (CHEAPEST_RE.test(q)) preference = "Cheapest";
  else if (LESS_WALK_RE.test(q)) preference = "Least Walking";
  else if (FEWEST_RE.test(q)) preference = "Fewest Transfers";
  else if (FASTEST_RE.test(q)) preference = "Fastest";
  else if (CROWD_RE.test(q) && AVOID_RE.test(q)) preference = "Avoid Crowding";
  if (constraints.requireAccessiblePreference) preference = "Accessible";

  // Primary intent (first meaningful match wins).
  let primary: GerakKhasIntent;
  if (LIVE_RE.test(q)) primary = "liveness";
  else if (VISUAL_RE.test(q)) primary = "visual";
  else if (LINE_RE.test(q) && station) primary = "station";
  else if (station && CROWD_RE.test(q) && !AVOID_RE.test(q)) primary = "crowding";
  else if (station && /(happening|going on|status|how is|what'?s up|condition|\bat\b)/.test(q) && !AVOID_RE.test(q)) primary = "station";
  else if (DEMAND_RE.test(q) && station) primary = "historicalDemand";
  else if (SERVICE_RE.test(q)) primary = "service";
  else if (WHICH_RE.test(q) && (preference || !station)) primary = "recommendation";
  else if (constraints.requireAccessiblePreference) primary = "accessibility";
  else if (constraints.requireBus) primary = "bus";
  else if (FARE_RE.test(q)) primary = "fare";
  else if (LESS_WALK_RE.test(q) || WALK_RE.test(q)) primary = "walking";
  else if (CROWD_RE.test(q)) primary = "crowding";
  else if (preference) primary = "recommendation";
  else if (WHY_RE.test(q)) primary = "recommendation";
  else if (station) primary = "station";
  else if (/(route|journey|get to|travel|go to|trip|way to|option|recommend)/.test(q)) primary = "journey";
  else primary = "unsupported";

  // Tools: the primary tool + bounded secondaries. Ranking is added whenever a
  // preference or a constraint can reorder the candidate set.
  const toolSet = new Set<MobilityToolName>();
  const secondary: GerakKhasIntent[] = [];
  const addTool = (t: MobilityToolName) => toolSet.add(t);

  switch (primary as GerakKhasIntent) {
    case "journey":
      addTool("journey");
      break;
    case "recovery":
      addTool("recovery");
      addTool("ranking");
      break;
    case "recommendation":
      addTool("journey");
      addTool("ranking");
      break;
    case "station":
      addTool("station");
      break;
    case "bus":
      addTool("bus");
      addTool("walking");
      addTool("fare");
      addTool("ranking");
      secondary.push("walking", "fare");
      break;
    case "fare":
      addTool("fare");
      addTool("ranking");
      break;
    case "walking":
      addTool("walking");
      addTool("ranking");
      break;
    case "crowding":
      addTool("pulse");
      if (AVOID_RE.test(q)) {
        addTool("ranking");
        secondary.push("recommendation");
      }
      break;
    case "service":
      addTool("service");
      break;
    case "accessibility":
      addTool("accessibility");
      addTool("walking");
      addTool("ranking");
      secondary.push("walking");
      break;
    case "historicalDemand":
      addTool("historicalDemand");
      break;
    case "visual":
      addTool("visual");
      addTool("station");
      break;
    case "liveness":
      addTool("journey");
      break;
    case "unsupported":
      break;
  }

  // Constraints that filter candidates always imply a ranking pass.
  if ((constraints.excludeStationIds.length > 0 || constraints.requireBus) && !toolSet.has("ranking")) {
    addTool("ranking");
  }
  // A named crowd/avoid station also wants a pulse reading.
  if (constraints.excludeStationIds.length > 0) addTool("pulse");

  return {
    primary,
    secondary,
    constraints,
    preference,
    stationId,
    tools: [...toolSet],
  };
}


