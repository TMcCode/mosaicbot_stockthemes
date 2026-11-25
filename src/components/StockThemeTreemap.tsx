"use client";

import { useEffect, useMemo, useState } from "react";

import { ThemeHeroTreemap } from "@/components/ThemeHeroTreemap";
import { useLiveStockThemes } from "@/hooks/useLiveStockThemes";
import {
  buildStockThemeTreemapNodes,
} from "@/lib/buildStockThemeTreemapNodes";
import { pickDefaultTreemapPeriod } from "@/lib/buildConstituentTreemapNodes";
import { formatTickerPerformanceAsOf } from "@/lib/formatSiteDataPublished";
import { fetchStockAppBrowser, mergeStockDetailWithApp } from "@/lib/mergeStockApp";
import type {
  StockDetailV0,
  StockThemeMembershipAppV0,
  StockThemeMembershipPublicV0,
} from "@/types/stock.detail.v0";

type Props = {
  ticker: string;
  displayName: string;
  dataBaseUrl: string;
  themes: StockThemeMembershipPublicV0[] | StockThemeMembershipAppV0[];
  /** When true, fetch Tier B `.app` for weights + theme returns. */
  hydrateTierB?: boolean;
  /** Fallback when live compare / Tier B as_of are not available yet. */
  asOfLabel?: string | null;
};

export function StockThemeTreemap({
  ticker,
  displayName,
  dataBaseUrl,
  themes: themesProp,
  hydrateTierB,
  asOfLabel,
}: Props) {
  const clientTierB = hydrateTierB ?? Boolean(dataBaseUrl);
  const themeShellKey = themesProp.map((t) => t.slug).join("|");
  const [themes, setThemes] = useState<StockThemeMembershipAppV0[]>(() =>
    themesProp.map((t) => ({ ...t })),
  );
  const [appPerfAsOf, setAppPerfAsOf] = useState<string | null>(null);

  useEffect(() => {
    setThemes(themesProp.map((t) => ({ ...t })));
    setAppPerfAsOf(null);
    if (!clientTierB || !dataBaseUrl) return;
    let cancelled = false;
    const shell: StockDetailV0 = {
      schema_version: 0,
      ticker,
      as_of: "",
      themes: themesProp.map((t) => ({
        slug: t.slug,
        name: t.name,
        group_slug: t.group_slug,
        group_name: t.group_name,
      })),
    };
    void (async () => {
      const app = await fetchStockAppBrowser(ticker);
      if (!app || cancelled) return;
      const merged = mergeStockDetailWithApp(shell, app);
      if (cancelled) return;
      setThemes(merged.themes);
      const perf =
        app.ticker_performance_as_of?.trim() || app.as_of?.trim() || null;
      setAppPerfAsOf(perf);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- themeShellKey stands in for themesProp
  }, [clientTierB, dataBaseUrl, ticker, themeShellKey]);

  const { themes: liveThemes, liveTickerPerformanceAsOf } = useLiveStockThemes(themes);
  const nodes = useMemo(() => buildStockThemeTreemapNodes(liveThemes), [liveThemes]);
  const defaultPeriod = useMemo(() => pickDefaultTreemapPeriod(nodes), [nodes]);

  const caption = useMemo(() => {
    // Colors follow live compare_themes when present; caption must match.
    const iso = liveTickerPerformanceAsOf || appPerfAsOf;
    if (iso) return formatTickerPerformanceAsOf(iso);
    return asOfLabel?.trim() || null;
  }, [liveTickerPerformanceAsOf, appPerfAsOf, asOfLabel]);

  if (!nodes.length) return null;

  return (
    <ThemeHeroTreemap
      nodes={nodes}
      themeName={displayName}
      tileMode="theme"
      defaultReturnPeriod={defaultPeriod}
      asOfLabel={caption}
    />
  );
}
