"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useOptionalSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { useWatchlist } from "@/components/WatchlistProvider";
import { WatchlistThemeAddCombobox } from "@/components/WatchlistThemeAddCombobox";
import { loadSearchIndexClient } from "@/lib/searchThemeHits";
import { normalizeWatchlistKey } from "@/lib/watchlist/api";
import {
  HOME_RADAR_HOME_CARD_LIMIT,
  homeRadarPinCountLabel,
  watchlistCountLabel,
} from "@/lib/watchlist/limitsCopy";

import styles from "./RadarWatchlistPanel.module.css";

/** Full watchlist manage UI — `/radar?tab=watchlist` only. */
export function RadarWatchlistPanel() {
  const { configured, loading: authLoading, user } = useOptionalSupabaseAuth();
  const watchlist = useWatchlist();
  const [namesBySlug, setNamesBySlug] = useState<Record<string, string>>({});
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadSearchIndexClient()
      .then((index) => {
        if (!index || cancelled) return;
        const map: Record<string, string> = {};
        for (const t of index.themes || []) {
          const slug = normalizeWatchlistKey("theme", t.slug || "");
          if (slug) map[slug] = t.name || slug;
        }
        setNamesBySlug(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const order = watchlist?.themeOrder ?? [];
    return order.map((slug) => ({
      slug,
      name: namesBySlug[slug] || slug,
      pinned: watchlist?.isHomeRadarPinned(slug) ?? false,
    }));
  }, [watchlist, namesBySlug]);

  if (!configured) {
    return (
      <div className={styles.wrap}>
        <p className={styles.muted}>Sign-in is not configured on this deployment.</p>
      </div>
    );
  }

  if (authLoading || !watchlist?.ready) {
    return (
      <div className={styles.wrap}>
        <p className={styles.muted}>Loading watchlist…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.wrap}>
        <p className={styles.lead}>Your watchlist</p>
        <p className={styles.help}>Sign in to save themes and pick home cards.</p>
        <Link href="/sign-in?next=%2Fradar%3Ftab%3Dwatchlist" className={styles.primaryLink}>
          Sign in free
        </Link>
      </div>
    );
  }

  const pinCount = watchlist.homeRadarSlugs.length;

  async function onRemove(slug: string) {
    if (!watchlist || busySlug) return;
    setBusySlug(slug);
    setMessage(null);
    const result = await watchlist.toggle("theme", slug);
    if (!result.ok) setMessage(result.message || "Could not remove theme.");
    setBusySlug(null);
  }

  async function onTogglePin(slug: string) {
    if (!watchlist || busySlug) return;
    setBusySlug(slug);
    setMessage(null);
    const result = await watchlist.toggleHomeRadarPin(slug);
    if (!result.ok) setMessage(result.message || "Could not update home cards.");
    setBusySlug(null);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <p className={styles.lead}>Your watchlist</p>
        <p className={styles.meta}>
          {watchlistCountLabel(watchlist.themeCount)}
          {" · "}
          {homeRadarPinCountLabel(pinCount)}
        </p>
      </div>

      <p className={styles.help}>
        Save up to 20 themes. Check up to {HOME_RADAR_HOME_CARD_LIMIT} for Narrative Radar cards on
        the home page.
      </p>

      <div className={styles.add}>
        <WatchlistThemeAddCombobox embedded />
      </div>

      {message ? <p className={styles.error}>{message}</p> : null}

      {rows.length === 0 ? (
        <p className={styles.muted}>No themes yet — search above to add one.</p>
      ) : (
        <ul className={styles.list} aria-label="Watchlist themes">
          {rows.map((row) => (
            <li key={row.slug} className={styles.row}>
              <label className={styles.pin}>
                <input
                  type="checkbox"
                  checked={row.pinned}
                  disabled={Boolean(busySlug) || (!row.pinned && pinCount >= HOME_RADAR_HOME_CARD_LIMIT)}
                  onChange={() => void onTogglePin(row.slug)}
                  aria-label={`Show ${row.name} on home`}
                />
                <span className={styles.pinLabel}>Home</span>
              </label>
              <Link href={`/themes/${row.slug}`} className={styles.themeLink}>
                {row.name}
              </Link>
              <button
                type="button"
                className={styles.remove}
                disabled={busySlug === row.slug}
                onClick={() => void onRemove(row.slug)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
