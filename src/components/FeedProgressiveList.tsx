"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CheckboxMultiSelectDropdown } from "@/components/CheckboxMultiSelectDropdown";
import { DeferRender } from "@/components/DeferRender";
import { FeedEventCardFlipper } from "./FeedEventCardFlipper";
import type { FeedFlipperSlot } from "@/lib/collapseFeedGroupFlippers";
import {
  feedActivityChipLabel,
  feedActivityOptionsFromEvents,
  feedSlotKinds,
  isFeedActivityFilterInactive,
  type FeedActivityKind,
} from "@/lib/feedActivityFilter";
import { isCompareSectorFilterInactive } from "@/lib/compareSectorFilter";
import { feedSlotSpySector, type FeedThemeMeta } from "@/lib/buildFeedThemeMeta";
import { formatFeedDateLong } from "@/lib/formatFeedDate";

import feedStyles from "@/app/feed/page.module.css";

type Props = {
  events: FeedFlipperSlot[];
  themeMetaBySlug?: Record<string, FeedThemeMeta>;
  thesisBySlug?: Record<string, string>;
  sectorOptions?: string[];
  listClassName: string;
  /** Cards in the first paint. */
  initialCount?: number;
  /** Extra cards revealed each time the sentinel enters view. */
  batchSize?: number;
  /** Mount this many cards immediately; rest wait for viewport (DeferRender). */
  eagerCount?: number;
};

function toggleKind(selected: FeedActivityKind[], kind: FeedActivityKind): FeedActivityKind[] {
  if (selected.includes(kind)) return selected.filter((k) => k !== kind);
  return [...selected, kind];
}

/**
 * Renders the first N feed cards immediately; mounts the rest as the user
 * scrolls near the bottom. Cards past ``eagerCount`` also defer until near
 * viewport so logos/chips don't block first paint. Activity-type chips + sector
 * filter are client-only (options precomputed from the SSR event list).
 */
export function FeedProgressiveList({
  events,
  themeMetaBySlug,
  thesisBySlug,
  sectorOptions = [],
  listClassName,
  initialCount = 8,
  batchSize = 8,
  eagerCount = 8,
}: Props) {
  const kindOptions = useMemo(() => feedActivityOptionsFromEvents(events), [events]);
  const [selectedKinds, setSelectedKinds] = useState<FeedActivityKind[]>(() => [...kindOptions]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>(() => [...sectorOptions]);
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(events.length, Math.max(0, initialCount)),
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [needsManualLoadMore, setNeedsManualLoadMore] = useState(false);

  const kindInactive = isFeedActivityFilterInactive(selectedKinds, kindOptions);
  const sectorInactive = isCompareSectorFilterInactive(selectedSectors, sectorOptions);
  const selectedKindSet = useMemo(() => new Set(selectedKinds), [selectedKinds]);
  const selectedSectorSet = useMemo(() => new Set(selectedSectors), [selectedSectors]);

  const filtered = useMemo(() => {
    return events.filter((slot) => {
      if (!kindInactive) {
        const kinds = feedSlotKinds(slot);
        if (!kinds.some((k) => selectedKindSet.has(k))) return false;
      }
      if (!sectorInactive) {
        if (!selectedSectorSet.has(feedSlotSpySector(slot, themeMetaBySlug))) return false;
      }
      return true;
    });
  }, [
    events,
    kindInactive,
    sectorInactive,
    selectedKindSet,
    selectedSectorSet,
    themeMetaBySlug,
  ]);

  useEffect(() => {
    setVisibleCount(Math.min(filtered.length, Math.max(0, initialCount)));
  }, [filtered.length, initialCount, selectedKinds, selectedSectors]);

  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setNeedsManualLoadMore(true);
    }
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    if (typeof IntersectionObserver === "undefined") return;
    let cancelled = false;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (cancelled) return;
        setVisibleCount((n) => Math.min(filtered.length, n + batchSize));
      },
      { root: null, rootMargin: "480px 0px", threshold: 0.01 },
    );
    obs.observe(node);
    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [hasMore, visibleCount, filtered.length, batchSize]);

  const visible = filtered.slice(0, visibleCount);
  const showFilters = kindOptions.length > 0 || sectorOptions.length > 0;
  const eager = Math.max(0, eagerCount);

  return (
    <div className={feedStyles.feedBlock}>
      {showFilters ? (
        <div className={feedStyles.filterBar}>
          {kindOptions.length > 0 ? (
            <div className={feedStyles.kindFilter} role="group" aria-label="Activity types">
              {kindOptions.map((kind) => {
                const on = selectedKindSet.has(kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    className={`${feedStyles.kindChip} ${on ? feedStyles.kindChipOn : ""}`}
                    aria-pressed={on}
                    onClick={() => setSelectedKinds((prev) => toggleKind(prev, kind))}
                  >
                    {feedActivityChipLabel(kind)}
                  </button>
                );
              })}
            </div>
          ) : null}
          {sectorOptions.length > 0 ? (
            <CheckboxMultiSelectDropdown
              label="Sectors"
              options={sectorOptions}
              selected={selectedSectors}
              onChange={setSelectedSectors}
              emptyLabel="All sectors"
              emptyMeansAll={false}
              layout="inline"
            />
          ) : null}
          <span className={feedStyles.filterCount}>
            {filtered.length === events.length
              ? `${events.length} updates`
              : `${filtered.length} of ${events.length} updates`}
          </span>
        </div>
      ) : null}
      {filtered.length === 0 ? (
        <p className={feedStyles.empty}>No updates match these filters.</p>
      ) : (
        <div className={listClassName}>
          {visible.map((slot, idx) => {
            const key = `${slot.lead.kind}-${slot.lead.event_at}-${idx}`;
            const card = (
              <FeedEventCardFlipper
                evt={slot.lead}
                dateLabel={formatFeedDateLong(slot.lead.event_at)}
                siblings={slot.siblings}
                themeMetaBySlug={themeMetaBySlug}
                thesisBySlug={thesisBySlug}
              />
            );
            if (idx < eager) {
              return <div key={key}>{card}</div>;
            }
            return (
              <DeferRender key={key} minHeight={148} rootMargin="240px 0px">
                {card}
              </DeferRender>
            );
          })}
        </div>
      )}
      {hasMore ? <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} /> : null}
      {hasMore ? (
        <button
          type="button"
          className={feedStyles.loadMore}
          onClick={() => setVisibleCount((n) => Math.min(filtered.length, n + batchSize))}
        >
          {needsManualLoadMore ? "Load more" : "Show more updates"}
        </button>
      ) : null}
    </div>
  );
}
