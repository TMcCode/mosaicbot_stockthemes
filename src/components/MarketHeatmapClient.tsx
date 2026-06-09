"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import pageStyles from "@/app/page.module.css";
import { CheckboxMultiSelectDropdown } from "@/components/CheckboxMultiSelectDropdown";
import {
  buildMarketHeatmapNodes,
  marketHeatmapSectorsFromTiles,
  marketHeatmapTilesAsTreemapNodes,
  type MarketHeatmapMode,
  type MarketHeatmapTile,
} from "@/lib/buildMarketHeatmapNodes";
import { buildNestedSectorTreemap } from "@/lib/buildNestedSectorTreemap";
import {
  pickDefaultTreemapPeriod,
  TREEMAP_RETURN_PERIODS,
  type TreemapReturnColumn,
} from "@/lib/buildConstituentTreemapNodes";
import type { HeatmapSectorSpdrReturns } from "@/lib/marketHeatmapSectors";
import {
  formatReturnPct,
  returnTileBackground,
} from "@/lib/treemapLayout";
import type { CompareThemesRowV0 } from "@/types/compare_themes.v0";
import type { ManifestGroupSummaryV0, ManifestThemeSummaryV0 } from "@/types/manifest.v0";

import styles from "./MarketHeatmapClient.module.css";

type Props = {
  eyebrow: string;
  asOfLabel?: string | null;
  groups: ManifestGroupSummaryV0[];
  themes: ManifestThemeSummaryV0[];
  compareRows: CompareThemesRowV0[];
  sectorSpdrReturns?: HeatmapSectorSpdrReturns;
};

function returnPctClass(ret: number | null | undefined): string {
  if (ret != null && ret > 0) return `${styles.returnPct} ${styles.returnPctUp}`;
  if (ret != null && ret < 0) return `${styles.returnPct} ${styles.returnPctDown}`;
  return `${styles.returnPct} ${styles.returnPctFlat}`;
}

function sectorSpdrReturn(
  sectorSpdrReturns: HeatmapSectorSpdrReturns | undefined,
  sector: string,
  period: TreemapReturnColumn | null,
): number | null {
  if (!period || !sectorSpdrReturns) return null;
  const v = sectorSpdrReturns[sector]?.[period];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function normalizeSearch(s: string): string {
  return s.trim().toLowerCase();
}

function tileMatchesSearch(tile: MarketHeatmapTile, q: string): boolean {
  if (!q) return true;
  return (
    tile.name.toLowerCase().includes(q) ||
    tile.slug.toLowerCase().includes(q) ||
    tile.sector.toLowerCase().includes(q)
  );
}

export function MarketHeatmapClient({
  eyebrow,
  asOfLabel,
  groups,
  themes,
  compareRows,
  sectorSpdrReturns = {},
}: Props) {
  const [mode, setMode] = useState<MarketHeatmapMode>("group");
  const [search, setSearch] = useState("");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);

  const baseTiles = useMemo(
    () => buildMarketHeatmapNodes({ mode, groups, themes, compareRows }),
    [mode, groups, themes, compareRows],
  );

  const sectorOptions = useMemo(() => marketHeatmapSectorsFromTiles(baseTiles), [baseTiles]);

  const activeSectors = useMemo(() => {
    const allowed = new Set(sectorOptions);
    const picked = selectedSectors.filter((s) => allowed.has(s));
    if (!picked.length || picked.length >= sectorOptions.length) return sectorOptions;
    return picked;
  }, [selectedSectors, sectorOptions]);

  const filteredTiles = useMemo(() => {
    const q = normalizeSearch(search);
    const sectorSet = new Set(activeSectors);
    return baseTiles.filter(
      (t) => sectorSet.has(t.sector) && tileMatchesSearch(t, q),
    );
  }, [baseTiles, search, activeSectors]);

  const treemapNodes = useMemo(
    () => marketHeatmapTilesAsTreemapNodes(filteredTiles),
    [filteredTiles],
  );

  const availablePeriods = useMemo(
    () =>
      TREEMAP_RETURN_PERIODS.filter(({ key }) =>
        treemapNodes.some((n) => n.returns[key] != null),
      ),
    [treemapNodes],
  );

  const fallbackPeriod = useMemo(() => pickDefaultTreemapPeriod(treemapNodes), [treemapNodes]);
  const [period, setPeriod] = useState<TreemapReturnColumn>(fallbackPeriod);

  const activePeriod: TreemapReturnColumn | null = availablePeriods.some((p) => p.key === period)
    ? period
    : (availablePeriods[0]?.key ?? null);

  const nestedRects = useMemo(
    () => buildNestedSectorTreemap(filteredTiles, marketHeatmapSectorsFromTiles(filteredTiles)),
    [filteredTiles],
  );

  const periodLabel = activePeriod
    ? (TREEMAP_RETURN_PERIODS.find((p) => p.key === activePeriod)?.label ?? activePeriod)
    : null;

  const modeLabel = mode === "group" ? "groups" : "themes";
  const countLabel = `${filteredTiles.length} ${modeLabel}`;

  const mobileBySector = useMemo(() => {
    const order = marketHeatmapSectorsFromTiles(filteredTiles);
    const map = new Map<string, MarketHeatmapTile[]>();
    for (const t of filteredTiles) {
      const list = map.get(t.sector) ?? [];
      list.push(t);
      map.set(t.sector, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    }
    return order.map((sector) => ({ sector, tiles: map.get(sector) ?? [] }));
  }, [filteredTiles]);

  return (
    <>
      <div className={pageStyles.heroGrid}>
        <div className={pageStyles.heroMain}>
          <p className={pageStyles.eyebrow}>{eyebrow}</p>
          <h1>Market heatmap</h1>
          <p className={pageStyles.introLead}>
            Sector heat map of every {mode === "group" ? "group" : "theme"} on stockthemes.ai.
            Tile size reflects average constituent market cap; color shows return for the selected
            horizon. Click a tile to open its detail page.
          </p>
          <p className={styles.mobileNote}>
            Best viewed on desktop — mobile shows a simplified sector list below.
          </p>
          <p className={styles.statsLine}>
            {countLabel}
            {sectorOptions.length ? ` · ${sectorOptions.length} sectors` : null}
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <span className={styles.toolbarLabel}>View</span>
          <div className={styles.toggle} role="group" aria-label="Heatmap entity type">
            <button
              type="button"
              className={mode === "group" ? styles.toggleActive : undefined}
              aria-pressed={mode === "group"}
              onClick={() => {
                setMode("group");
                setSelectedSectors([]);
              }}
            >
              Groups
            </button>
            <button
              type="button"
              className={mode === "theme" ? styles.toggleActive : undefined}
              aria-pressed={mode === "theme"}
              onClick={() => {
                setMode("theme");
                setSelectedSectors([]);
              }}
            >
              Themes
            </button>
          </div>
        </div>

        <div className={styles.toolbarRow}>
          <label className={styles.searchWrap}>
            <span className={styles.toolbarLabel}>Search</span>
            <input
              type="search"
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Filter ${modeLabel}…`}
              aria-label={`Search ${modeLabel}`}
            />
          </label>
          <CheckboxMultiSelectDropdown
            label="Sectors"
            options={sectorOptions}
            selected={selectedSectors}
            onChange={setSelectedSectors}
            emptyLabel="All sectors"
            layout="inline"
            compact
          />
        </div>

        {availablePeriods.length > 0 ? (
          <div className={styles.toolbarRow}>
            <span className={styles.toolbarLabel}>Color by</span>
            <div className={styles.toggle} role="group" aria-label="Return period for heatmap colors">
              {availablePeriods.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={activePeriod === key ? styles.toggleActive : undefined}
                  aria-pressed={activePeriod === key}
                  onClick={() => setPeriod(key)}
                >
                  {label}%
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {!filteredTiles.length ? (
        <p className={styles.empty}>No {modeLabel} match your filters.</p>
      ) : (
        <>
          <div className={styles.desktopMapWrap}>
            <div
              className={styles.map}
              role="img"
              aria-label={
                periodLabel
                  ? `Market heatmap by ${modeLabel}, colored by ${periodLabel} percent change, grouped by sector`
                  : `Market heatmap by ${modeLabel}, grouped by sector`
              }
            >
              {nestedRects.map((r) => {
                if (r.kind === "label") {
                  const sectorRet = sectorSpdrReturn(sectorSpdrReturns, r.sector, activePeriod);
                  return (
                    <div
                      key={`label-${r.sector}-${r.x}-${r.y}`}
                      className={styles.sectorLabel}
                      style={{
                        left: `${r.x}%`,
                        top: `${r.y}%`,
                        width: `${r.w}%`,
                        height: `${r.h}%`,
                      }}
                    >
                      <span className={styles.sectorLabelName}>{r.sector}</span>
                      {activePeriod != null && sectorRet != null ? (
                        <span className={returnPctClass(sectorRet)}>
                          {formatReturnPct(sectorRet)}
                        </span>
                      ) : null}
                    </div>
                  );
                }
                const t = r.tile;
                const ret =
                  activePeriod != null ? (t.returns[activePeriod] ?? null) : null;
                const title =
                  periodLabel
                    ? `${t.name} · ${t.sector} · ${periodLabel}: ${formatReturnPct(ret)}`
                    : `${t.name} · ${t.sector}`;
                return (
                  <Link
                    key={`${t.slug}-${r.x}-${r.y}`}
                    href={t.href}
                    className={`${styles.cell} ${styles.cellLink}`}
                    style={{
                      left: `${r.x}%`,
                      top: `${r.y}%`,
                      width: `${r.w}%`,
                      height: `${r.h}%`,
                      background: returnTileBackground(ret),
                    }}
                    title={title}
                  >
                    <span className={styles.cellName}>{t.name}</span>
                    {activePeriod != null ? (
                      <span className={returnPctClass(ret)}>{formatReturnPct(ret)}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
            {asOfLabel ? <p className={styles.asOf}>As of {asOfLabel}</p> : null}
          </div>

          <div className={styles.mobileList}>
            <p className={styles.mobileListIntro}>Sector list (simplified mobile view)</p>
            {mobileBySector.map(({ sector, tiles: sectorTiles }) =>
              sectorTiles.length ? (
                <section key={sector} className={styles.mobileSector}>
                  <h2 className={styles.mobileSectorTitle}>
                    <span>{sector}</span>
                    {(() => {
                      const sectorRet = sectorSpdrReturn(sectorSpdrReturns, sector, activePeriod);
                      return activePeriod != null && sectorRet != null ? (
                        <span className={returnPctClass(sectorRet)}>
                          {formatReturnPct(sectorRet)}
                        </span>
                      ) : null;
                    })()}
                  </h2>
                  <ul className={styles.mobileRows}>
                    {sectorTiles.map((t) => {
                      const ret =
                        activePeriod != null ? (t.returns[activePeriod] ?? null) : null;
                      return (
                        <li key={t.slug}>
                          <Link href={t.href} className={styles.mobileRow}>
                            <span className={styles.mobileRowName}>{t.name}</span>
                            {activePeriod != null ? (
                              <span className={returnPctClass(ret)}>
                                {formatReturnPct(ret)}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null,
            )}
          </div>
        </>
      )}
    </>
  );
}
