"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { useOptionalSupabaseAuth } from "@/components/SupabaseAuthProvider";
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
  /** Icon-only star aligned beside a page title (no pill border). */
  inline?: boolean;
  /** Large theme/group hero: baseline-aligned with multi-line titles. */
  titleAdjacent?: boolean;
  signInNext?: string;
};

export function WatchlistStar({
  itemType,
  itemKey,
  label,
  compact,
  prominent,
  inline,
  titleAdjacent,
  signInNext,
}: Props) {
  const showLabel = (!compact || prominent) && !inline;
  const titleStar = Boolean(inline && titleAdjacent);
  const { configured, user } = useOptionalSupabaseAuth();
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

  const wrapClass = [
    styles.wrap,
    prominent ? styles.wrapProminent : "",
    inline ? styles.wrapInline : "",
    titleStar ? styles.wrapTitle : "",
  ]
    .filter(Boolean)
    .join(" ");
  const Wrap = inline ? "span" : "div";

  if (!user) {
    return (
      <Wrap className={wrapClass}>
        <Link
          href={signInHref}
          className={
            titleStar
              ? styles.signInLinkTitle
              : `${styles.signInLink} ${compact ? styles.signInLinkCompact : ""} ${prominent ? styles.signInLinkProminent : ""} ${inline ? styles.signInLinkInline : ""}`
          }
          title={`Sign in to save ${label} to your watchlist`}
          aria-label={`Sign in to save ${label} to your watchlist`}
          onClick={(e) => e.stopPropagation()}
        >
          ☆
          {showLabel ? <span>Save to Watchlist</span> : null}
        </Link>
      </Wrap>
    );
  }

  const actionTitle =
    message ||
    (saved ? `Remove ${label} from watchlist` : `Save ${label} to watchlist`);

  return (
    <Wrap className={wrapClass}>
      <button
        type="button"
        className={
          titleStar
            ? `${styles.starTitle} ${saved ? styles.starTitleSaved : ""}`
            : `${styles.star} ${compact ? styles.starCompact : ""} ${prominent ? styles.starProminent : ""} ${inline ? styles.starInline : ""} ${saved ? styles.starSaved : ""}`
        }
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void onToggle();
        }}
        disabled={busy || !watchlist?.ready}
        aria-pressed={saved}
        aria-busy={busy || undefined}
        title={actionTitle}
      >
        {saved ? "★" : "☆"}
        {showLabel ? (
          <span>{saved ? "Saved to Watchlist" : "Save to Watchlist"}</span>
        ) : null}
      </button>
      {message && !inline ? (
        <p className={`${styles.hint} ${styles.hintError}`} role="status">
          {message}
        </p>
      ) : null}
    </Wrap>
  );
}
