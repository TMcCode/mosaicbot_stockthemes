"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getCachedSearchIndex,
  loadSearchIndexBrowser,
  subscribeSearchIndex,
} from "@/lib/searchIndexBrowser";
import type { SiteSearchEngine } from "@/lib/siteSearchRank";
import type { SearchIndexV0 } from "@/types/search_index.v0";

function toEngine(index: SearchIndexV0): SiteSearchEngine {
  return { index };
}

/**
 * Shared search-index state for comboboxes: fast first paint from cache/primary URL,
 * then swaps if CDN stale-while-revalidate finds a newer `as_of`.
 */
export function useSiteSearchEngine(): {
  engine: SiteSearchEngine | null;
  loadBusy: boolean;
  loadError: string | null;
  ensureLoaded: () => void;
} {
  const [engine, setEngine] = useState<SiteSearchEngine | null>(() => {
    const cached = getCachedSearchIndex();
    return cached ? toEngine(cached) : null;
  });
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadInflight = useRef(false);

  useEffect(() => {
    return subscribeSearchIndex((index) => {
      setEngine(toEngine(index));
      setLoadError(null);
    });
  }, []);

  const ensureLoaded = useCallback(() => {
    if (engine || loadInflight.current) {
      return;
    }
    loadInflight.current = true;
    setLoadBusy(true);
    setLoadError(null);
    void loadSearchIndexBrowser()
      .then((index) => {
        setEngine(toEngine(index));
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load search index");
        setEngine(null);
      })
      .finally(() => {
        loadInflight.current = false;
        setLoadBusy(false);
      });
  }, [engine]);

  return { engine, loadBusy, loadError, ensureLoaded };
}
