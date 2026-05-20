"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { useWatchlist } from "@/components/WatchlistProvider";

import type { WatchlistItemType } from "@/lib/watchlist/types";

import styles from "./WatchlistStar.module.css";

type Props = {
  itemType: WatchlistItemType;
  itemKey: string;
  /** Accessible label prefix, e.g. theme name or ticker symbol. */
  label: string;
  compact?: boolean;
  /** Theme detail hero: larger button, full label, left-aligned under title. */
  prominent?: boolean;
  signInNext?: string;
};

export function WatchlistStar({ itemType, itemKey, label, compact, prominent, signInNext }: Props) {
  const showLabel = !compact || prominent;
  const { configured, user } = useSupabaseAuth();
  const watchlist = useWatchlist();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saved = watchlist?.isSaved(itemType, itemKey) ?? false;

  const onToggle = useCallback(async () => {
    if (!watchlist || busy) return;
    setMessage(null);
    setBusy(true);
    try {
      const result = await watchlist.toggle(itemType, itemKey);
      if (!result.ok && result.message) {
        setMessage(result.message);
      }
    } finally {
      setBusy(false);
    }
  }, [watchlist, busy, itemType, itemKey]);

  if (!configured) {
    return null;
  }

  const signInHref = signInNext ? `/sign-in?next=${encodeURIComponent(signInNext)}` : "/sign-in";

  if (!user) {
    return (
      <div className={`${styles.wrap} ${prominent ? styles.wrapProminent : ""}`}>
        <Link
          href={signInHref}
          className={`${styles.signInLink} ${compact ? styles.signInLinkCompact : ""} ${prominent ? styles.signInLinkProminent : ""}`}
          title={`Sign in to save ${label} to your watchlist`}
          aria-label={`Sign in to save ${label} to your watchlist`}
          onClick={(e) => e.stopPropagation()}
        >
          ☆
          {showLabel ? <span>Save to Watchlist</span> : null}
        </Link>
      </div>
    );
  }

  return (
    <div className={`${styles.wrap} ${prominent ? styles.wrapProminent : ""}`}>
      <button
        type="button"
        className={`${styles.star} ${compact ? styles.starCompact : ""} ${prominent ? styles.starProminent : ""} ${saved ? styles.starSaved : ""}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void onToggle();
        }}
        disabled={busy || !watchlist?.ready}
        aria-pressed={saved}
        aria-busy={busy || undefined}
        title={saved ? `Remove ${label} from watchlist` : `Save ${label} to watchlist`}
      >
        {saved ? "★" : "☆"}
        {showLabel ? (
          <span>{saved ? "Saved to Watchlist" : "Save to Watchlist"}</span>
        ) : null}
      </button>
      {message ? (
        <p className={`${styles.hint} ${styles.hintError}`} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
