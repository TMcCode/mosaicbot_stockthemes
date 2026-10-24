import type {
  ThemeNeighborRowV0,
  ThemeThemeNeighborsV0,
} from "@/types/theme.theme_neighbors.v0";

export const THEME_NEIGHBORS_SIDECAR_SUFFIX = ".theme_neighbors.v0.json";

function finite(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function neighborRow(value: unknown): ThemeNeighborRowV0 | null {
  const row = record(value);
  const slug = text(row.slug);
  const theme = text(row.theme);
  const correlation = finite(row.correlation);
  if (!slug || !theme || correlation == null) return null;
  const overlap = finite(row.overlapping_ticker_count);
  return {
    slug,
    theme,
    correlation,
    ...(overlap == null ? {} : { overlapping_ticker_count: Math.max(0, Math.round(overlap)) }),
  };
}

function neighborList(value: unknown): ThemeNeighborRowV0[] {
  return (Array.isArray(value) ? value : [])
    .map(neighborRow)
    .filter((item): item is ThemeNeighborRowV0 => item != null);
}

export function themeNeighborsUrl(dataBaseUrl: string, slug: string): string {
  return `${dataBaseUrl.replace(/\/$/, "")}/themes/${encodeURIComponent(slug)}${THEME_NEIGHBORS_SIDECAR_SUFFIX}`;
}

const OUTSIDE_TILE_LIMIT = 3;
const IN_GROUP_TILE_LIMIT = 5;

function takeExtreme(
  rows: ThemeNeighborRowV0[],
  direction: "highest" | "lowest",
  limit: number,
): ThemeNeighborRowV0[] {
  if (rows.length === 0) return [];
  const sorted =
    direction === "highest"
      ? [...rows].sort((a, b) => b.correlation - a.correlation || a.theme.localeCompare(b.theme))
      : [...rows].sort((a, b) => a.correlation - b.correlation || a.theme.localeCompare(b.theme));
  return sorted.slice(0, limit);
}

export function parseThemeNeighbors(raw: string): ThemeThemeNeighborsV0 | null {
  const row = record(JSON.parse(raw));
  if (row.schema_version !== "theme.theme_neighbors.v0") return null;
  const slug = text(row.slug);
  const window = text(row.window) || "1Y";
  const aggType = text(row.agg_type) || "manual_theme_weights";
  if (!slug) return null;
  let closestInGroup = neighborList(row.closest_in_group);
  let furthestInGroup = neighborList(row.furthest_in_group);
  let closestAcross = neighborList(row.closest_across);
  let furthestOutside = neighborList(row.furthest_outside);
  // Legacy sidecars: full in_group + closest_outside / least_related_outside.
  if (!closestInGroup.length && !furthestInGroup.length) {
    const legacyInGroup = neighborList(row.in_group);
    closestInGroup = takeExtreme(legacyInGroup, "highest", IN_GROUP_TILE_LIMIT);
    furthestInGroup = takeExtreme(legacyInGroup, "lowest", IN_GROUP_TILE_LIMIT);
  }
  if (!closestAcross.length) {
    closestAcross = neighborList(row.closest_outside).slice(0, OUTSIDE_TILE_LIMIT);
  }
  if (!furthestOutside.length) {
    furthestOutside = neighborList(row.least_related_outside).slice(0, OUTSIDE_TILE_LIMIT);
  }
  const total = finite(row.in_group_total);
  return {
    schema_version: "theme.theme_neighbors.v0",
    slug,
    theme: text(row.theme) || undefined,
    as_of: text(row.as_of) || undefined,
    window,
    agg_type: aggType,
    group: text(row.group) || undefined,
    in_group_total: Math.max(0, Math.round(total ?? 0)),
    closest_in_group: closestInGroup,
    furthest_in_group: furthestInGroup,
    closest_across: closestAcross,
    furthest_outside: furthestOutside,
  };
}

export function themeNeighborsHasContent(data: ThemeThemeNeighborsV0 | null): boolean {
  if (!data) return false;
  return (
    data.closest_in_group.length > 0 ||
    data.furthest_in_group.length > 0 ||
    data.closest_across.length > 0 ||
    data.furthest_outside.length > 0
  );
}
