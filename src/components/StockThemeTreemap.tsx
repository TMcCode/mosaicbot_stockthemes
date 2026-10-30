"use client";

import { useEffect, useMemo, useState } from "react";

import { ThemeHeroTreemap } from "@/components/ThemeHeroTreemap";
import {
  buildStockThemeTreemapNodes,
} from "@/lib/buildStockThemeTreemapNodes";
import { pickDefaultTreemapPeriod } from "@/lib/buildConstituentTreemapNodes";
import {
  mergeStockDetailWithApp,
  parseStockAppPayload,
  stockAppBrowserPath,
} from "@/lib/mergeStockApp";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
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

  useEffect(() => {
    setThemes(themesProp.map((t) => ({ ...t })));
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
      try {
        const q = stockthemesBrowserCacheBusterQuery();
        const path = `${stockAppBrowserPath(ticker)}${q ? `?${q}` : ""}`;
        const res = await fetch(path, { cache: stockthemesBrowserFetchCache() });
        if (!res.ok || cancelled) return;
        const raw: unknown = await res.json();
        const app = parseStockAppPayload(raw);
        if (!app || cancelled) return;
        const merged = mergeStockDetailWithApp(shell, app);
        if (!cancelled) setThemes(merged.themes);
      } catch {
        /* keep shell */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- themeShellKey stands in for themesProp
  }, [clientTierB, dataBaseUrl, ticker, themeShellKey]);

  const nodes = useMemo(() => buildStockThemeTreemapNodes(themes), [themes]);
  const defaultPeriod = useMemo(() => pickDefaultTreemapPeriod(nodes), [nodes]);

  if (!nodes.length) return null;

  return (
    <ThemeHeroTreemap
      nodes={nodes}
      themeName={displayName}
      tileMode="theme"
      defaultReturnPeriod={defaultPeriod}
      asOfLabel={asOfLabel}
    />
  );
}
