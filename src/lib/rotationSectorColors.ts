import { MARKET_HEATMAP_SECTOR_ORDER } from "@/lib/marketHeatmapSectors";

/** Distinct hues for GICS + Macro/Other (matches site chart palette family). */
const SECTOR_PALETTE = [
  "#34d399",
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#fcd34d",
  "#fb923c",
  "#60a5fa",
  "#4ade80",
  "#e879f9",
  "#94a3b8",
  "#f87171",
  "#2dd4bf",
  "#c084fc",
] as const;

const FALLBACK_SECTOR_COLOR = "#94a3b8";

export function buildRotationSectorColorMap(sectors: Iterable<string>): Map<string, string> {
  const ordered = [...new Set(sectors)].sort((a, b) => {
    const ai = MARKET_HEATMAP_SECTOR_ORDER.indexOf(a as (typeof MARKET_HEATMAP_SECTOR_ORDER)[number]);
    const bi = MARKET_HEATMAP_SECTOR_ORDER.indexOf(b as (typeof MARKET_HEATMAP_SECTOR_ORDER)[number]);
    const ar = ai >= 0 ? ai : 999;
    const br = bi >= 0 ? bi : 999;
    if (ar !== br) return ar - br;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });

  const map = new Map<string, string>();
  ordered.forEach((sector, i) => {
    map.set(sector, SECTOR_PALETTE[i % SECTOR_PALETTE.length] ?? FALLBACK_SECTOR_COLOR);
  });
  return map;
}

export function rotationSectorColor(
  sector: string | null | undefined,
  colorMap: Map<string, string>,
): string {
  const key = String(sector ?? "").trim() || "Other";
  return colorMap.get(key) ?? FALLBACK_SECTOR_COLOR;
}
