"use client";

import { useEffect, useState } from "react";

import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { parseThemeRevenue, revenueHasContent, themeRevenueUrl } from "@/lib/themeRevenue";
import type { ThemeRevenueV0 } from "@/types/theme.revenue.v0";

export type ThemeRevenueSidecarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "absent" }
  | { status: "ok"; data: ThemeRevenueV0 }
  | { status: "error" };

/** Lazy-fetch revenue sidecar once when revenue or revisions view is opened. */
export function useThemeRevenueSidecar(
  slug: string | undefined,
  dataBaseUrl: string | undefined,
  enabled: boolean,
): ThemeRevenueSidecarState {
  const [state, setState] = useState<ThemeRevenueSidecarState>({ status: "idle" });

  useEffect(() => {
    if (!enabled) return;
    if (!slug || !dataBaseUrl) {
      setState({ status: "absent" });
      return;
    }
    let cancelled = false;
    const url = `${themeRevenueUrl(dataBaseUrl, slug)}?${stockthemesBrowserCacheBusterQuery()}`;
    setState({ status: "loading" });
    fetch(url, { credentials: "omit", cache: stockthemesBrowserFetchCache() })
      .then((res) => {
        if (!res.ok) throw new Error(`revenue sidecar ${res.status}`);
        return res.text();
      })
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseThemeRevenue(raw);
        setState(revenueHasContent(parsed) ? { status: "ok", data: parsed } : { status: "absent" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, dataBaseUrl, enabled]);

  return state;
}
