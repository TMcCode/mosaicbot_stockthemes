"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import {
  deleteWatchlistItem,
  fetchWatchlistItems,
  insertWatchlistItem,
  normalizeWatchlistKey,
} from "@/lib/watchlist/api";
import { formatWatchlistError } from "@/lib/watchlist/errors";
import type { WatchlistItemType } from "@/lib/watchlist/types";

type WatchlistContextValue = {
  ready: boolean;
  themeKeys: ReadonlySet<string>;
  tickerKeys: ReadonlySet<string>;
  themeCount: number;
  tickerCount: number;
  isSaved: (itemType: WatchlistItemType, itemKey: string) => boolean;
  toggle: (itemType: WatchlistItemType, itemKey: string) => Promise<{ ok: boolean; message?: string }>;
  refresh: () => Promise<void>;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function useWatchlist(): WatchlistContextValue | null {
  return useContext(WatchlistContext);
}

function rowsToSets(
  rows: { item_type: WatchlistItemType; item_key: string }[],
): { themeKeys: Set<string>; tickerKeys: Set<string> } {
  const themeKeys = new Set<string>();
  const tickerKeys = new Set<string>();
  for (const row of rows) {
    const key = normalizeWatchlistKey(row.item_type, row.item_key);
    if (row.item_type === "theme") {
      themeKeys.add(key);
    } else {
      tickerKeys.add(key);
    }
  }
  return { themeKeys, tickerKeys };
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { configured, user } = useSupabaseAuth();
  const [ready, setReady] = useState(false);
  const [themeKeys, setThemeKeys] = useState<Set<string>>(() => new Set());
  const [tickerKeys, setTickerKeys] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(async () => {
    if (!configured || !user) {
      setThemeKeys(new Set());
      setTickerKeys(new Set());
      setReady(true);
      return;
    }
    try {
      const rows = await fetchWatchlistItems(user.id);
      const sets = rowsToSets(rows);
      setThemeKeys(sets.themeKeys);
      setTickerKeys(sets.tickerKeys);
    } catch {
      setThemeKeys(new Set());
      setTickerKeys(new Set());
    } finally {
      setReady(true);
    }
  }, [configured, user]);

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  const isSaved = useCallback(
    (itemType: WatchlistItemType, itemKey: string) => {
      const key = normalizeWatchlistKey(itemType, itemKey);
      return itemType === "theme" ? themeKeys.has(key) : tickerKeys.has(key);
    },
    [themeKeys, tickerKeys],
  );

  const toggle = useCallback(
    async (itemType: WatchlistItemType, itemKey: string) => {
      if (!configured) {
        return { ok: false, message: "Sign-in is not available on this site." };
      }
      if (!user) {
        return { ok: false, message: "Sign in to save to your watchlist." };
      }

      const key = normalizeWatchlistKey(itemType, itemKey);
      const saved = itemType === "theme" ? themeKeys.has(key) : tickerKeys.has(key);

      if (saved) {
        if (itemType === "theme") {
          setThemeKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        } else {
          setTickerKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
        try {
          await deleteWatchlistItem(user.id, itemType, itemKey);
          return { ok: true };
        } catch (e: unknown) {
          await refresh();
          const message = formatWatchlistError(e instanceof Error ? e.message : String(e));
          return { ok: false, message };
        }
      }

      setThemeKeys((prev) => (itemType === "theme" ? new Set(prev).add(key) : prev));
      setTickerKeys((prev) => (itemType === "ticker" ? new Set(prev).add(key) : prev));
      try {
        await insertWatchlistItem(user.id, itemType, itemKey);
        void import("posthog-js")
          .then(({ default: posthog }) => {
            posthog.capture("watchlist_add", { item_type: itemType, item_key: key });
          })
          .catch(() => {});
        return { ok: true };
      } catch (e: unknown) {
        await refresh();
        const message = formatWatchlistError(e instanceof Error ? e.message : String(e));
        return { ok: false, message };
      }
    },
    [configured, user, themeKeys, tickerKeys, refresh],
  );

  const value = useMemo<WatchlistContextValue>(
    () => ({
      ready,
      themeKeys,
      tickerKeys,
      themeCount: themeKeys.size,
      tickerCount: tickerKeys.size,
      isSaved,
      toggle,
      refresh,
    }),
    [ready, themeKeys, tickerKeys, isSaved, toggle, refresh],
  );

  if (!configured) {
    return <>{children}</>;
  }

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}
