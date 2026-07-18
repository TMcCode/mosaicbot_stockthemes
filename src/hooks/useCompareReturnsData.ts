"use client";

import { useEffect, useRef, useState } from "react";

import { parseCompareThemesJson } from "@/lib/mergeLiveCompareData";
import {
  priceReturnsBrowserCacheBusterQuery,
  priceReturnsRevalidateSeconds,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesLiveCompareReturnsEnabled } from "@/lib/stockthemesClientConfig";
import { stockthemesBrowserSidecarFetchBase } from "@/lib/stockthemesPublicBase";
import type { CompareGroupsV0 } from "@/types/compare_groups.v0";
import type { CompareThemesV0 } from "@/types/compare_themes.v0";

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    credentials: "omit",
    cache: stockthemesBrowserFetchCache(),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function parseCompareGroups(value: unknown): CompareGroupsV0 | null {
  if (!value || typeof value !== "object") return null;
  const bundle = value as Partial<CompareGroupsV0>;
  if (bundle.schema_version !== 0 || !bundle.as_of || !Array.isArray(bundle.rows)) return null;
  return bundle as CompareGroupsV0;
}

export function useLiveCompareThemes(): CompareThemesV0 | null {
  const enabled = stockthemesLiveCompareReturnsEnabled();
  const base = stockthemesBrowserSidecarFetchBase();
  const [bundle, setBundle] = useState<CompareThemesV0 | null>(null);

  useEffect(() => {
    if (!enabled || !base) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const raw = await fetchJson(
          `${base}/compare_themes.v0.json?${priceReturnsBrowserCacheBusterQuery()}`,
        );
        const parsed = parseCompareThemesJson(raw);
        if (!cancelled && parsed) setBundle(parsed);
      } catch {
        /* Keep the statically rendered rows. */
      }
    };
    void refresh();
    const id = window.setInterval(refresh, priceReturnsRevalidateSeconds() * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, base]);

  return bundle;
}

export function useLazyCompareGroups(active: boolean): {
  bundle: CompareGroupsV0 | null;
  loading: boolean;
  failed: boolean;
} {
  const base = stockthemesBrowserSidecarFetchBase();
  const [bundle, setBundle] = useState<CompareGroupsV0 | null>(null);
  const bundleRef = useRef<CompareGroupsV0 | null>(null);
  const lastFetchAtRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active || !base) return;
    let cancelled = false;
    const refresh = async () => {
      if (!bundleRef.current) setLoading(true);
      try {
        const raw = await fetchJson(
          `${base}/compare_groups.v0.json?${priceReturnsBrowserCacheBusterQuery()}`,
        );
        const parsed = parseCompareGroups(raw);
        if (!cancelled && parsed) {
          bundleRef.current = parsed;
          lastFetchAtRef.current = Date.now();
          setBundle(parsed);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const intervalMs = priceReturnsRevalidateSeconds() * 1000;
    if (!bundleRef.current || Date.now() - lastFetchAtRef.current >= intervalMs) {
      void refresh();
    }
    const id = window.setInterval(refresh, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active, base]);

  return { bundle, loading, failed };
}
