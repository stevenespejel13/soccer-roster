import type { Position } from './types';

/**
 * Determine position from (x%, y%) on the field.
 * Field orientation: top = attack, bottom = defend.
 *
 * Zone rules (y from top):
 *   y < 25              → FWD
 *   25 ≤ y < 50         → MID
 *   50 ≤ y, outside GK box → DEF
 *   y ≥ 50, x 25–75 and y ≥ 75 → GK  (penalty + goal area at bottom)
 */
export function getPositionFromCoords(x: number, y: number): Position {
  if (y < 25) return 'FWD';
  if (y < 50) return 'MID';
  if (y >= 75 && x >= 25 && x <= 75) return 'GK';
  return 'DEF';
}

/** Default field coordinates for players laid out by position zone */
const ZONE_Y: Record<Position, number> = {
  FWD: 14,
  MID: 38,
  DEF: 63,
  GK: 85,
};

function spreadX(count: number): number[] {
  if (count === 0) return [];
  if (count === 1) return [50];
  const margin = 12;
  const step = (100 - 2 * margin) / (count - 1);
  return Array.from({ length: count }, (_, i) => margin + i * step);
}

/** Compute initial (fieldX, fieldY) for a list of same-position players */
export function layoutGroup(
  players: { id: string; position: Position }[]
): Record<string, { x: number; y: number }> {
  const groups: Record<Position, string[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of players) groups[p.position].push(p.id);

  const result: Record<string, { x: number; y: number }> = {};
  for (const pos of Object.keys(groups) as Position[]) {
    const ids = groups[pos];
    const xs = spreadX(ids.length);
    ids.forEach((id, i) => {
      result[id] = { x: xs[i], y: ZONE_Y[pos] };
    });
  }
  return result;
}
