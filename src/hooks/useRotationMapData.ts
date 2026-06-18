"use client";

import { useEffect, useState } from "react";

import { buildRotationMapData, type RotationMapData } from "@/lib/buildRotationMapData";
import { parseSpySnapshotJson } from "@/lib/parseSpySnapshot";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { CompareThemesV0 } from "@/types/compare_themes.v0";
import type { ManifestV0 } from "@/types/manifest.v0";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; asOf: string; mapData: RotationMapData }
  | { status: "error" };

function parseCompareThemes(raw: unknown): CompareThemesV0 | null {
  try {
    const data = raw as CompareThemesV0;
    if (data.schema_version !== 0 || !data.as_of || !Array.isArray(data.rows)) return null;
    return data;
  } catch {
    return null;
  }
}

function parseManifest(raw: unknown): ManifestV0 | null {
  try {
    const data = raw as ManifestV0;
    if (data.schema_version !== 0 || !Array.isArray(data.groups) || !Array.isArray(data.themes)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** Fetches rotation inputs from CDN only when enabled (signed-in /rotation). */
export function useRotationMapData(enabled: boolean): LoadState {
  const [state, setState] = useState<LoadState>({ status: "idle" });

  useEffect(() => {
    if (!enabled) {
      setState({ status: "idle" });
      return;
    }

    const base = stockthemesPublicDataBase();
    if (!base) {
      setState({ status: "error" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    const q = stockthemesBrowserCacheBusterQuery();
    const fetchJson = async (path: string): Promise<unknown> => {
      const res = await fetch(`${base}/${path}?${q}`, {
        credentials: "omit",
        cache: stockthemesBrowserFetchCache(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<unknown>;
    };

    void Promise.all([
      fetchJson("manifest.json"),
      fetchJson("compare_themes.v0.json"),
      fetchJson("spy_snapshot.v0.json"),
    ])
      .then(([manifestRaw, compareRaw, spyRaw]) => {
        if (cancelled) return;
        const manifest = parseManifest(manifestRaw);
        const compare = parseCompareThemes(compareRaw);
        const spy = parseSpySnapshotJson(spyRaw);
        if (!manifest || !compare) {
          setState({ status: "error" });
          return;
        }
        const asOf = compare.as_of || manifest.as_of;
        const mapData = buildRotationMapData({
          asOf,
          groups: manifest.groups,
          themes: manifest.themes,
          compareRows: compare.rows,
          spyCompareReturns: spy?.compareReturns ?? null,
        });
        setState({ status: "ready", asOf, mapData });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
