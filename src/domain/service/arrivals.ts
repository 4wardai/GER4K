/**
 * Simulated arrival countdowns (Requirement 18.4) — SIMULATED LIVE DATA.
 *
 * GER4K has no realtime feed connected, so arrival countdowns are generated
 * deterministically from a service id, a typical headway and the current
 * minute. The UI must label these "Simulated live data" — they are never LIVE.
 */

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** Minutes until the next simulated arrival, in [1, headwayMin]. */
export function simulatedNextArrivalMin(
  serviceId: string,
  headwayMin: number,
  nowMs: number,
): number {
  const h = Math.max(2, Math.round(headwayMin));
  const minute = Math.floor(nowMs / 60_000);
  return h - ((minute + hash(serviceId)) % h);
}
