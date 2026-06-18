import type { RotationMapPoint } from "@/lib/buildRotationMapData";

export type RotationQuadrantId =
  | "long_term_leaders"
  | "leaders"
  | "laggards"
  | "new_momentum";

export const ROTATION_QUADRANT_LABELS: Record<RotationQuadrantId, string> = {
  long_term_leaders: "Long-term leaders",
  leaders: "Leaders",
  laggards: "Laggards",
  new_momentum: "New momentum",
};

/** SPY sits at (0, 0); treat axis values as non-negative when exactly zero. */
export function classifyRotationQuadrant(x: number, y: number): RotationQuadrantId {
  if (x >= 0 && y >= 0) return "leaders";
  if (x < 0 && y >= 0) return "long_term_leaders";
  if (x >= 0 && y < 0) return "new_momentum";
  return "laggards";
}

export function countRotationQuadrants(
  groups: RotationMapPoint[],
): Record<RotationQuadrantId, number> {
  const counts: Record<RotationQuadrantId, number> = {
    long_term_leaders: 0,
    leaders: 0,
    laggards: 0,
    new_momentum: 0,
  };
  for (const g of groups) {
    counts[classifyRotationQuadrant(g.x, g.y)] += 1;
  }
  return counts;
}

export function filterGroupsByQuadrant(
  groups: RotationMapPoint[],
  quadrant: RotationQuadrantId,
): RotationMapPoint[] {
  return groups.filter((g) => classifyRotationQuadrant(g.x, g.y) === quadrant);
}

export type RotationMotionMover = {
  slug: string;
  name: string;
  deltaX: number;
};

export function rotationGroupMotionDelta(point: RotationMapPoint): number | null {
  const from = point.motionFrom;
  if (!from || !Number.isFinite(from.x) || !Number.isFinite(point.x)) return null;
  return point.x - from.x;
}

export function computeRotationHeatingCooling(
  groups: RotationMapPoint[],
  limit = 3,
): { heating: RotationMotionMover[]; cooling: RotationMotionMover[] } {
  const movers: RotationMotionMover[] = [];
  for (const g of groups) {
    const deltaX = rotationGroupMotionDelta(g);
    if (deltaX == null || deltaX === 0) continue;
    movers.push({ slug: g.slug, name: g.name, deltaX });
  }
  movers.sort((a, b) => b.deltaX - a.deltaX);
  const heating = movers.filter((m) => m.deltaX > 0).slice(0, limit);
  const cooling = movers
    .filter((m) => m.deltaX < 0)
    .sort((a, b) => a.deltaX - b.deltaX)
    .slice(0, limit);
  return { heating, cooling };
}
