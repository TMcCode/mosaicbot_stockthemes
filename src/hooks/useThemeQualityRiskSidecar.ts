"use client";

import { useEffect, useState } from "react";

import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import {
  parseThemeQualityRisk,
  qualityRiskHasContent,
  themeQualityRiskUrl,
} from "@/lib/themeQualityRisk";
import type { ThemeQualityRiskV0 } from "@/types/theme.quality_risk.v0";

export type ThemeQualityRiskSidecarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "absent" }
  | { status: "ok"; data: ThemeQualityRiskV0 }
  | { status: "error" };

/** Fetches the dedicated quality/risk sidecar only after its tab becomes active. */
export function useThemeQualityRiskSidecar(
  slug: string | undefined,
  dataBaseUrl: string | undefined,
  enabled: boolean,
): ThemeQualityRiskSidecarState {
  const [state, setState] = useState<ThemeQualityRiskSidecarState>({ status: "idle" });

  useEffect(() => {
    if (!enabled) return;
    if (!slug || !dataBaseUrl) return;
    let cancelled = false;
    const controller = new AbortController();
    const url = `${themeQualityRiskUrl(dataBaseUrl, slug)}?${stockthemesBrowserCacheBusterQuery()}`;
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
        if (!response.ok) throw new Error(`quality/risk sidecar ${response.status}`);
        return response.text();
      })
      .then((raw) => {
        if (cancelled) return;
        if (raw === null) {
          setState({ status: "absent" });
          return;
        }
        const parsed = parseThemeQualityRisk(raw);
        setState(qualityRiskHasContent(parsed) ? { status: "ok", data: parsed } : { status: "absent" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug, dataBaseUrl, enabled]);

  return enabled && (!slug || !dataBaseUrl) ? { status: "absent" } : state;
}
