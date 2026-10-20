"use client";

import { useMemo } from "react";

import { ThemeHeroTreemap } from "@/components/ThemeHeroTreemap";
import { useLiveCompareBundles } from "@/hooks/useLiveCompareBundles";
import {
  pickDefaultTreemapPeriod,
  type TreemapReturnColumn,
} from "@/lib/buildConstituentTreemapNodes";
import { buildGroupThemeTreemapNodes } from "@/lib/buildGroupThemeTreemapNodes";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import { mergeGroupThemeTableCompareReturns } from "@/lib/mergeLiveCompareData";
import type { GroupDetailThemeTreemapV0 } from "@/types/group.detail.v0";

type Props = {
  treemap: GroupDetailThemeTreemapV0;
  themeName: string;
  defaultReturnPeriod?: TreemapReturnColumn;
  /** Overnight group JSON stamp; replaced once live compare_themes loads. */
  serverAsOfLabel?: string | null;
};

/**
 * Group hero market map: keep equal-weight layout from baked ``theme_treemap``,
 * overlay returns + as-of from the ~10‑min ``compare_themes`` bundle (same path as
 * ``GroupThemesTableLive``).
 */
export function GroupHeroTreemapLive({
  treemap,
  themeName,
  defaultReturnPeriod,
  serverAsOfLabel,
}: Props) {
  const { compareBundle, liveTickerPerformanceAsOf } = useLiveCompareBundles(null, null);
  const nodes = useMemo(() => {
    const themes = mergeGroupThemeTableCompareReturns(
      treemap.themes,
      compareBundle?.rows ?? [],
    );
    return buildGroupThemeTreemapNodes({ ...treemap, themes });
  }, [treemap, compareBundle?.rows]);

  if (!nodes.length) return null;

  const liveIso = (liveTickerPerformanceAsOf || compareBundle?.as_of || "").trim();
  const asOfLabel = liveIso
    ? formatSiteDataPublished(liveIso)
    : serverAsOfLabel || undefined;

  return (
    <ThemeHeroTreemap
      nodes={nodes}
      themeName={themeName}
      tileMode="theme"
      defaultReturnPeriod={defaultReturnPeriod ?? pickDefaultTreemapPeriod(nodes)}
      asOfLabel={asOfLabel}
    />
  );
}
