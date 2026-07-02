import { cache } from "react";

import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import { parseThemeRevenue, REVENUE_SIDECAR_SUFFIX } from "@/lib/themeRevenue";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { ThemeRevenueV0 } from "@/types/theme.revenue.v0";

async function loadLiveThemeRevenue(slug: string): Promise<ThemeRevenueV0 | null> {
  const base = stockthemesPublicDataBase();
  if (!base) return null;
  const rel = `themes/${slug}${REVENUE_SIDECAR_SUFFIX}`;
  const url = `${base}/themes/${encodeURIComponent(slug)}${REVENUE_SIDECAR_SUFFIX}`;
  try {
    const raw = await fetchPublicJsonText(url, rel);
    return parseThemeRevenue(raw);
  } catch {
    return null;
  }
}

export const getThemeRevenueCached = cache(async (slug: string): Promise<ThemeRevenueV0 | null> => {
  return loadLiveThemeRevenue(slug);
});
