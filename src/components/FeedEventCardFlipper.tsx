"use client";

import { useEffect, useMemo, useState } from "react";

import {
  FeedEventCardBody,
  type FeedThemeMeta,
} from "./FeedEventCardBody";
import {
  feedEventNeedsThesisHydration,
  fetchFeedThesisPreview,
} from "@/lib/fetchFeedThesisPreview";
import { formatFeedDateLong, formatFeedDateShort } from "@/lib/formatFeedDate";
import type { ManifestHomeFeedEventV0 } from "@/types/manifest.v0";

import styles from "./FeedEventCard.module.css";

export type FeedEventCardProps = {
  evt: ManifestHomeFeedEventV0;
  dateLabel: string;
  compact?: boolean;
  siblings?: ManifestHomeFeedEventV0[] | null;
  themeMetaBySlug?: Record<string, FeedThemeMeta>;
  tickersByThemeSlug?: Record<string, { tickers: string[]; more: number }>;
  thesisBySlug?: Record<string, string>;
};

/** Client island: radar-style ‹ n/N › when ≥3 same-group siblings; fills missing thesis. */
export function FeedEventCardFlipper({
  evt,
  dateLabel,
  compact = false,
  siblings = null,
  themeMetaBySlug,
  tickersByThemeSlug,
  thesisBySlug,
}: FeedEventCardProps) {
  const themes = Array.isArray(siblings) && siblings.length >= 3 ? siblings : null;
  const [idx, setIdx] = useState(0);
  const [hydratedThesis, setHydratedThesis] = useState<Record<string, string>>({});
  const fmt = compact ? formatFeedDateShort : formatFeedDateLong;

  const members = themes ?? [evt];
  const mergedThesis = useMemo(
    () => ({ ...(thesisBySlug || {}), ...hydratedThesis }),
    [thesisBySlug, hydratedThesis],
  );

  useEffect(() => {
    // Compact home cards are logo strips — skip thesis fetch.
    if (compact) return;
    let cancelled = false;
    const need = members
      .map((e) => feedEventNeedsThesisHydration(e, mergedThesis))
      .filter((s): s is string => Boolean(s));
    const unique = [...new Set(need)];
    if (!unique.length) return;

    void Promise.all(
      unique.map(async (slug) => {
        const text = await fetchFeedThesisPreview(slug);
        if (cancelled || !text) return;
        setHydratedThesis((prev) => (prev[slug] ? prev : { ...prev, [slug]: text }));
      }),
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- members identity via theme slugs
  }, [
    compact,
    thesisBySlug,
    members.map((e) => `${e.kind}:${e.theme_slug}:${e.thesis_preview || ""}`).join("|"),
  ]);

  if (!themes) {
    return (
      <FeedEventCardBody
        evt={evt}
        dateLabel={dateLabel}
        compact={compact}
        themeMetaBySlug={themeMetaBySlug}
        tickersByThemeSlug={tickersByThemeSlug}
        thesisBySlug={mergedThesis}
      />
    );
  }

  const safeIdx = ((idx % themes.length) + themes.length) % themes.length;
  const current = themes[safeIdx] ?? evt;
  const currentDate = fmt(current.event_at) || dateLabel;

  const flipperNav = (
    <div className={styles.flipperNav} role="group" aria-label="Updates in this group">
      <button
        type="button"
        className={styles.flipperBtn}
        aria-label="Previous update in group"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIdx((i) => i - 1);
        }}
      >
        ‹
      </button>
      <span className={styles.flipperCount} aria-live="polite">
        {safeIdx + 1}/{themes.length}
      </span>
      <button
        type="button"
        className={styles.flipperBtn}
        aria-label="Next update in group"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIdx((i) => i + 1);
        }}
      >
        ›
      </button>
    </div>
  );

  return (
    <FeedEventCardBody
      evt={current}
      dateLabel={currentDate}
      compact={compact}
      flipperNav={flipperNav}
      themeMetaBySlug={themeMetaBySlug}
      tickersByThemeSlug={tickersByThemeSlug}
      thesisBySlug={mergedThesis}
    />
  );
}
