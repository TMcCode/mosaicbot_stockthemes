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
  fetchHomeRadarThemeSlugs,
  fetchWatchlistItems,
  insertWatchlistItem,
  normalizeHomeRadarSlugs,
  normalizeWatchlistKey,
  updateHomeRadarThemeSlugs,
} from "@/lib/watchlist/api";
import { formatWatchlistError } from "@/lib/watchlist/errors";
import {
  HOME_RADAR_HOME_CARD_LIMIT,
  homeRadarPinsFullMessage,
} from "@/lib/watchlist/limitsCopy";
import type { WatchlistItemType } from "@/lib/watchlist/types";

type WatchlistContextValue = {
  ready: boolean;
  themeKeys: ReadonlySet<string>;
  /** Watchlist theme slugs in saved order. */
  themeOrder: readonly string[];
  /** theme slug → watchlist_items.created_at ISO (when saved). */
  themeAddedAt: ReadonlyMap<string, string>;
  tickerKeys: ReadonlySet<string>;
  themeCount: number;
  tickerCount: number;
  /** Ordered theme slugs for home Narrative Radar Watchlist cards (≤6). */
  homeRadarSlugs: readonly string[];
  isSaved: (itemType: WatchlistItemType, itemKey: string) => boolean;
  isHomeRadarPinned: (slug: string) => boolean;
  toggle: (itemType: WatchlistItemType, itemKey: string) => Promise<{ ok: boolean; message?: string }>;
  toggleHomeRadarPin: (slug: string) => Promise<{ ok: boolean; message?: string }>;
  refresh: () => Promise<void>;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function useWatchlist(): WatchlistContextValue | null {
  return useContext(WatchlistContext);
}

function rowsToSets(
  rows: { item_type: WatchlistItemType; item_key: string; created_at?: string }[],
): {
  themeKeys: Set<string>;
  themeOrder: string[];
  themeAddedAt: Map<string, string>;
  tickerKeys: Set<string>;
} {
  const themeKeys = new Set<string>();
  const themeOrder: string[] = [];
  const themeAddedAt = new Map<string, string>();
  const tickerKeys = new Set<string>();
  for (const row of rows) {
    const key = normalizeWatchlistKey(row.item_type, row.item_key);
    if (row.item_type === "theme") {
      if (!themeKeys.has(key)) {
        themeKeys.add(key);
        themeOrder.push(key);
        if (row.created_at) themeAddedAt.set(key, row.created_at);
      }
    } else {
      tickerKeys.add(key);
    }
  }
  return { themeKeys, themeOrder, themeAddedAt, tickerKeys };
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { configured, user } = useSupabaseAuth();
  const [ready, setReady] = useState(false);
  const [themeKeys, setThemeKeys] = useState<Set<string>>(() => new Set());
  const [themeOrder, setThemeOrder] = useState<string[]>([]);
  const [themeAddedAt, setThemeAddedAt] = useState<Map<string, string>>(() => new Map());
  const [tickerKeys, setTickerKeys] = useState<Set<string>>(() => new Set());
  const [homeRadarSlugs, setHomeRadarSlugs] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    if (!configured || !user) {
      setThemeKeys(new Set());
      setThemeOrder([]);
      setThemeAddedAt(new Map());
      setTickerKeys(new Set());
      setHomeRadarSlugs([]);
      setReady(true);
      return;
    }
    try {
      const [rows, pins] = await Promise.all([
        fetchWatchlistItems(user.id),
        fetchHomeRadarThemeSlugs(user.id),
      ]);
      const sets = rowsToSets(rows);
      setThemeKeys(sets.themeKeys);
      setThemeOrder(sets.themeOrder);
      setThemeAddedAt(sets.themeAddedAt);
      setTickerKeys(sets.tickerKeys);
      // Drop pins that are no longer on the watchlist.
      setHomeRadarSlugs(normalizeHomeRadarSlugs(pins.filter((s) => sets.themeKeys.has(s))));
    } catch {
      setThemeKeys(new Set());
      setThemeOrder([]);
      setThemeAddedAt(new Map());
      setTickerKeys(new Set());
      setHomeRadarSlugs([]);
    } finally {
      setReady(true);
    }
  }, [configured, user]);

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  const persistHomePins = useCallback(
    async (next: string[]) => {
      if (!user) return;
      const normalized = normalizeHomeRadarSlugs(next);
      setHomeRadarSlugs(normalized);
      try {
        await updateHomeRadarThemeSlugs(user.id, normalized);
      } catch {
        await refresh();
        throw new Error("Could not save home cards. Apply migration 006 if you have not yet.");
      }
    },
    [user, refresh],
  );

  const isSaved = useCallback(
    (itemType: WatchlistItemType, itemKey: string) => {
      const key = normalizeWatchlistKey(itemType, itemKey);
      return itemType === "theme" ? themeKeys.has(key) : tickerKeys.has(key);
    },
    [themeKeys, tickerKeys],
  );

  const isHomeRadarPinned = useCallback(
    (slug: string) => homeRadarSlugs.includes(normalizeWatchlistKey("theme", slug)),
    [homeRadarSlugs],
  );

  const toggleHomeRadarPin = useCallback(
    async (slug: string) => {
      if (!configured) {
        return { ok: false, message: "Sign-in is not available on this site." };
      }
      if (!user) {
        return { ok: false, message: "Sign in to choose home cards." };
      }
      const key = normalizeWatchlistKey("theme", slug);
      if (!themeKeys.has(key)) {
        return { ok: false, message: "Add the theme to your watchlist first." };
      }
      const idx = homeRadarSlugs.indexOf(key);
      if (idx >= 0) {
        const next = homeRadarSlugs.filter((s) => s !== key);
        try {
          await persistHomePins(next);
          return { ok: true };
        } catch (e: unknown) {
          return { ok: false, message: e instanceof Error ? e.message : String(e) };
        }
      }
      if (homeRadarSlugs.length >= HOME_RADAR_HOME_CARD_LIMIT) {
        return { ok: false, message: homeRadarPinsFullMessage() };
      }
      try {
        await persistHomePins([...homeRadarSlugs, key]);
        return { ok: true };
      } catch (e: unknown) {
        return { ok: false, message: e instanceof Error ? e.message : String(e) };
      }
    },
    [configured, user, themeKeys, homeRadarSlugs, persistHomePins],
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
          setThemeOrder((prev) => prev.filter((s) => s !== key));
          setThemeAddedAt((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
          setHomeRadarSlugs((prev) => prev.filter((s) => s !== key));
        } else {
          setTickerKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
        try {
          await deleteWatchlistItem(user.id, itemType, itemKey);
          if (itemType === "theme") {
            const nextPins = homeRadarSlugs.filter((s) => s !== key);
            if (nextPins.length !== homeRadarSlugs.length) {
              try {
                await updateHomeRadarThemeSlugs(user.id, nextPins);
              } catch {
                /* non-fatal; next refresh will reconcile */
              }
            }
          }
          return { ok: true };
        } catch (e: unknown) {
          await refresh();
          const message = formatWatchlistError(e instanceof Error ? e.message : String(e));
          return { ok: false, message };
        }
      }

      if (itemType === "theme") {
        setThemeKeys((prev) => new Set(prev).add(key));
        setThemeOrder((prev) => (prev.includes(key) ? prev : [...prev, key]));
        setThemeAddedAt((prev) => {
          if (prev.has(key)) return prev;
          const next = new Map(prev);
          next.set(key, new Date().toISOString());
          return next;
        });
      } else {
        setTickerKeys((prev) => new Set(prev).add(key));
      }
      try {
        await insertWatchlistItem(user.id, itemType, itemKey);
        if (itemType === "theme" && homeRadarSlugs.length < HOME_RADAR_HOME_CARD_LIMIT) {
          const nextPins = normalizeHomeRadarSlugs([...homeRadarSlugs, key]);
          setHomeRadarSlugs(nextPins);
          try {
            await updateHomeRadarThemeSlugs(user.id, nextPins);
          } catch {
            /* pin optional until migration applied */
          }
        }
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
    [configured, user, themeKeys, tickerKeys, homeRadarSlugs, refresh],
  );

  const value = useMemo<WatchlistContextValue>(
    () => ({
      ready,
      themeKeys,
      themeOrder,
      themeAddedAt,
      tickerKeys,
      themeCount: themeKeys.size,
      tickerCount: tickerKeys.size,
      homeRadarSlugs,
      isSaved,
      isHomeRadarPinned,
      toggle,
      toggleHomeRadarPin,
      refresh,
    }),
    [
      ready,
      themeKeys,
      themeOrder,
      themeAddedAt,
      tickerKeys,
      homeRadarSlugs,
      isSaved,
      isHomeRadarPinned,
      toggle,
      toggleHomeRadarPin,
      refresh,
    ],
  );

  if (!configured) {
    return <>{children}</>;
  }

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}
