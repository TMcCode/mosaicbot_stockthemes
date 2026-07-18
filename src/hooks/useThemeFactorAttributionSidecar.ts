"use client";

import { useEffect, useState } from "react";

import {
  factorAttributionHasContent,
  parseThemeFactorAttribution,
  themeFactorAttributionUrl,
} from "@/lib/themeFactorAttribution";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import type { ThemeFactorAttributionV0 } from "@/types/theme.factor_attribution.v0";

export type ThemeFactorAttributionSidecarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "absent" }
  | { status: "ok"; data: ThemeFactorAttributionV0 }
  | { status: "error" };

/** Fetches attribution only after the Factor Drivers sub-tab mounts. */
export function useThemeFactorAttributionSidecar(
  slug: string | undefined,
  dataBaseUrl: string | undefined,
): ThemeFactorAttributionSidecarState {
  const [state, setState] = useState<ThemeFactorAttributionSidecarState>({ status: "idle" });

  useEffect(() => {
    if (!slug || !dataBaseUrl) return;
    let cancelled = false;
    const controller = new AbortController();
    const url = `${themeFactorAttributionUrl(dataBaseUrl, slug)}?${stockthemesBrowserCacheBusterQuery()}`;
    Promise.resolve().then(() => {
      if (!cancelled) setState({ status: "loading" });
    });
    fetch(url, {
      credentials: "omit",
      cache: stockthemesBrowserFetchCache(),
      signal: controller.signal,
    })
      .then((response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`factor attribution sidecar ${response.status}`);
        return response.text();
      })
      .then((raw) => {
        if (cancelled) return;
        if (raw === null) {
          setState({ status: "absent" });
          return;
        }
        const parsed = parseThemeFactorAttribution(raw);
        setState(
          factorAttributionHasContent(parsed)
            ? { status: "ok", data: parsed }
            : { status: "absent" },
        );
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug, dataBaseUrl]);

  return !slug || !dataBaseUrl ? { status: "absent" } : state;
}
