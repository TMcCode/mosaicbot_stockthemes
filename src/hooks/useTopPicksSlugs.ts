"use client";

import { useCallback, useEffect, useState } from "react";

import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { TopPicksV0 } from "@/types/top_picks.v0";

type TopPicksSlugSets = {
  themeSlugs: string[];
  groupSlugs: string[];
  ready: boolean;
  ensureLoaded: () => void;
};

const EMPTY_SLUGS = { themeSlugs: [] as string[], groupSlugs: [] as string[] };

let memo: { themeSlugs: string[]; groupSlugs: string[] } | null = null;
let inflight: Promise<{ themeSlugs: string[]; groupSlugs: string[] }> | null = null;

async function fetchTopPicksSlugs(): Promise<{ themeSlugs: string[]; groupSlugs: string[] }> {
  if (memo) return memo;
  if (inflight) return inflight;

  inflight = (async () => {
    const base = stockthemesPublicDataBase();
    if (!base) return EMPTY_SLUGS;
    try {
      const res = await fetch(`${base}/top_picks.v0.json`, { cache: "force-cache" });
      if (!res.ok) return EMPTY_SLUGS;
      const data = (await res.json()) as TopPicksV0;
      if (data?.schema_version !== 0) return EMPTY_SLUGS;
      const themeSlugs = Array.isArray(data.theme_slugs)
        ? data.theme_slugs.map((s) => String(s || "").trim()).filter(Boolean)
        : [];
      const groupSlugs = Array.isArray(data.group_slugs)
        ? data.group_slugs.map((s) => String(s || "").trim()).filter(Boolean)
        : [];
      memo = { themeSlugs, groupSlugs };
      return memo;
    } catch {
      return EMPTY_SLUGS;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Top Picks for /compare — fetch only when first needed so it never competes
 * with the ~1MB compare_themes hydrate.
 */
export function useTopPicksSlugs(needed: boolean): TopPicksSlugSets {
  const [sets, setSets] = useState(() =>
    memo ? { ...memo, ready: true } : { ...EMPTY_SLUGS, ready: false },
  );

  const ensureLoaded = useCallback(() => {
    if (memo) {
      setSets({ ...memo, ready: true });
      return;
    }
    void fetchTopPicksSlugs().then((next) => {
      setSets({ ...next, ready: true });
    });
  }, []);

  useEffect(() => {
    if (!needed) return;
    ensureLoaded();
  }, [needed, ensureLoaded]);

  return {
    themeSlugs: sets.themeSlugs,
    groupSlugs: sets.groupSlugs,
    ready: sets.ready || Boolean(memo),
    ensureLoaded,
  };
}
