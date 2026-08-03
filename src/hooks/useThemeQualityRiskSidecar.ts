"use client";

import { useEffect, useState } from "react";

import {
  getThemeSidecarMemory,
  isThemeSidecarTerminalStatus,
  setThemeSidecarMemory,
  themeSidecarCacheKey,
} from "@/lib/themeSidecarMemoryCache";
import { fetchThemeTableSidecarText } from "@/lib/themeTableSidecarFetch";
import {
  parseThemeQualityRisk,
  qualityRiskHasContent,
} from "@/lib/themeQualityRisk";
import type { ThemeQualityRiskV0 } from "@/types/theme.quality_risk.v0";

export type ThemeQualityRiskSidecarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "absent" }
  | { status: "ok"; data: ThemeQualityRiskV0 }
  | { status: "error" };

const CACHE_NS = "theme-quality-risk";

function initialState(
  slug: string | undefined,
  dataBaseUrl: string | undefined,
): ThemeQualityRiskSidecarState {
  if (slug && dataBaseUrl) {
    const cached = getThemeSidecarMemory<ThemeQualityRiskSidecarState>(
      CACHE_NS,
      themeSidecarCacheKey(dataBaseUrl, slug),
    );
    if (cached && isThemeSidecarTerminalStatus(cached.status)) return cached;
  }
  return { status: "idle" };
}

/** Fetches quality/risk once per theme after the tab is opened; reuses across toggles. */
export function useThemeQualityRiskSidecar(
  slug: string | undefined,
  dataBaseUrl: string | undefined,
  enabled: boolean,
): ThemeQualityRiskSidecarState {
  const [state, setState] = useState<ThemeQualityRiskSidecarState>(() =>
    initialState(slug, dataBaseUrl),
  );

  useEffect(() => {
    if (!enabled) return;
    if (!slug || !dataBaseUrl) return;

    const key = themeSidecarCacheKey(dataBaseUrl, slug);
    const cached = getThemeSidecarMemory<ThemeQualityRiskSidecarState>(CACHE_NS, key);
    if (cached && isThemeSidecarTerminalStatus(cached.status)) {
      setState(cached);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (!cancelled) setState({ status: "loading" });
    });
    fetchThemeTableSidecarText("quality_risk", slug, dataBaseUrl, controller.signal)
      .then((raw) => {
        if (cancelled) return;
        if (raw === null) {
          const next: ThemeQualityRiskSidecarState = { status: "absent" };
          setThemeSidecarMemory(CACHE_NS, key, next);
          setState(next);
          return;
        }
        const parsed = parseThemeQualityRisk(raw);
        const next: ThemeQualityRiskSidecarState = qualityRiskHasContent(parsed)
          ? { status: "ok", data: parsed }
          : { status: "absent" };
        setThemeSidecarMemory(CACHE_NS, key, next);
        setState(next);
      })
      .catch(() => {
        if (cancelled) return;
        const next: ThemeQualityRiskSidecarState = { status: "error" };
        setThemeSidecarMemory(CACHE_NS, key, next);
        setState(next);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug, dataBaseUrl, enabled]);

  return enabled && (!slug || !dataBaseUrl) ? { status: "absent" } : state;
}
