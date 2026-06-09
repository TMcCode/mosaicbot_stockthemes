import { buildTreemapRects, type TreemapLayoutNode } from "@/lib/treemapLayout";
import type { MarketHeatmapTile } from "@/lib/buildMarketHeatmapNodes";

export type NestedSectorTileRect = {
  kind: "tile";
  sector: string;
  tile: MarketHeatmapTile;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type NestedSectorLabelRect = {
  kind: "label";
  sector: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type NestedSectorRect = NestedSectorTileRect | NestedSectorLabelRect;

type SectorBucket = {
  sector: string;
  tiles: MarketHeatmapTile[];
  weight: number;
};

const SECTOR_GAP = 0.45;
const TILE_GAP = 0.35;
const LABEL_MIN_PCT = 2.8;
const LABEL_MAX_PCT = 5.5;

function bucketTiles(tiles: MarketHeatmapTile[], sectorOrder: string[]): SectorBucket[] {
  const bySector = new Map<string, MarketHeatmapTile[]>();
  for (const t of tiles) {
    const list = bySector.get(t.sector) ?? [];
    list.push(t);
    bySector.set(t.sector, list);
  }
  const ordered = sectorOrder.filter((s) => bySector.has(s));
  const buckets: SectorBucket[] = [];
  for (const sector of ordered) {
    const sectorTiles = bySector.get(sector) ?? [];
    const weight = sectorTiles.reduce((s, t) => s + t.weight, 0);
    if (weight <= 0) continue;
    buckets.push({ sector, tiles: sectorTiles, weight });
  }
  return buckets;
}

/** Finviz-style: sector blocks sized by total mcap weight, tiles nested inside each block. */
export function buildNestedSectorTreemap(
  tiles: MarketHeatmapTile[],
  sectorOrder: string[],
): NestedSectorRect[] {
  const buckets = bucketTiles(tiles, sectorOrder);
  if (!buckets.length) return [];

  const sectorNodes: TreemapLayoutNode<SectorBucket>[] = buckets.map((b) => ({
    data: b,
    weight: b.weight,
  }));
  const sectorRects = buildTreemapRects(sectorNodes, 0, 0, 100, 100);
  const out: NestedSectorRect[] = [];

  for (const sr of sectorRects) {
    const bucket = sr.data;
    const gap = SECTOR_GAP / 2;
    const sx = sr.x + gap;
    const sy = sr.y + gap;
    const sw = Math.max(1, sr.w - SECTOR_GAP);
    const sh = Math.max(1, sr.h - SECTOR_GAP);

    const labelH = Math.min(LABEL_MAX_PCT, Math.max(LABEL_MIN_PCT, sh * 0.1));
    out.push({
      kind: "label",
      sector: bucket.sector,
      x: sx,
      y: sy,
      w: sw,
      h: labelH,
    });

    const innerY = sy + labelH;
    const innerH = Math.max(1, sh - labelH);
    const tileNodes: TreemapLayoutNode<MarketHeatmapTile>[] = bucket.tiles.map((t) => ({
      data: t,
      weight: t.weight,
    }));
    const tileRects = buildTreemapRects(tileNodes, sx, innerY, sw, innerH);
    for (const tr of tileRects) {
      const left = tr.x + TILE_GAP / 2;
      const top = tr.y + TILE_GAP / 2;
      out.push({
        kind: "tile",
        sector: bucket.sector,
        tile: tr.data,
        x: left,
        y: top,
        w: Math.max(1.5, tr.w - TILE_GAP),
        h: Math.max(1.5, tr.h - TILE_GAP),
      });
    }
  }

  return out;
}
