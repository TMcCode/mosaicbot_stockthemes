"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdPlacement } from "@/components/AdPlacement";
import { WatchlistStar } from "@/components/WatchlistStar";

import listStyles from "./ThemesProgressiveList.module.css";

type ThemeRow = {
  slug: string;
  name: string;
  groupName: string;
  tickerCount: number | null;
};

type Props = {
  themes: ThemeRow[];
  blockSize?: number;
  initialBlocks?: number;
  classNameList: string;
  classNameListLink: string;
  classNameName: string;
  classNameMeta: string;
  classNameAdSlot: string;
  classNameAdChartEnd: string;
};

export function ThemesProgressiveList({
  themes,
  blockSize = 50,
  initialBlocks = 2,
  classNameList,
  classNameListLink,
  classNameName,
  classNameMeta,
  classNameAdSlot,
  classNameAdChartEnd,
}: Props) {
  const router = useRouter();
  const prefetchedHrefsRef = useRef<Set<string>>(new Set());
  const totalBlocks = Math.max(1, Math.ceil(themes.length / blockSize));
  const [visibleBlocks, setVisibleBlocks] = useState(Math.min(initialBlocks, totalBlocks));
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const visibleThemeCount = Math.min(themes.length, visibleBlocks * blockSize);
  /** Only true after mount when IntersectionObserver is missing (avoids SSR/client HTML mismatch). */
  const [needsManualLoadMore, setNeedsManualLoadMore] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setNeedsManualLoadMore(true);
    }
  }, []);

  const blocks = useMemo(() => {
    const out: ThemeRow[][] = [];
    for (let start = 0; start < visibleThemeCount; start += blockSize) {
      out.push(themes.slice(start, Math.min(themes.length, start + blockSize)));
    }
    return out;
  }, [themes, visibleThemeCount, blockSize]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visibleBlocks >= totalBlocks) return;
    if (typeof IntersectionObserver === "undefined") return;
    let cancelled = false;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!cancelled) {
          setVisibleBlocks((b) => Math.min(totalBlocks, b + 1));
        }
      },
      { root: null, rootMargin: "400px 0px", threshold: 0.01 },
    );
    obs.observe(node);
    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [visibleBlocks, totalBlocks]);

  const prefetchHref = (href: string) => {
    if (prefetchedHrefsRef.current.has(href)) return;
    prefetchedHrefsRef.current.add(href);
    void router.prefetch(href);
  };

  return (
    <>
      {blocks.map((slice, idx) => {
        const globalBlockIdx = idx;
        const moreBlocksExist = globalBlockIdx < totalBlocks - 1;
        return (
          <div key={`themes-block-${idx}`}>
            <ul className={classNameList} style={{ listStyle: "none", paddingLeft: 0 }}>
              {slice.map((t) => (
                <li key={t.slug}>
                  <div className={listStyles.row}>
                    <WatchlistStar
                      compact
                      itemType="theme"
                      itemKey={t.slug}
                      label={t.name}
                      signInNext={`/themes/${t.slug}`}
                    />
                    <Link
                      href={`/themes/${t.slug}`}
                      className={`${classNameListLink} ${listStyles.rowLink}`}
                      prefetch={false}
                      onMouseEnter={() => prefetchHref(`/themes/${t.slug}`)}
                      onFocus={() => prefetchHref(`/themes/${t.slug}`)}
                    >
                      <span className={classNameName}>{t.name}</span>
                      <span className={classNameMeta}>
                        {t.groupName}
                        {t.groupName && t.tickerCount != null ? " · " : ""}
                        {t.tickerCount != null ? `${t.tickerCount} tickers` : ""}
                      </span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
            {moreBlocksExist ? (
              <AdPlacement
                placement="themesIndexStrip"
                className={`${classNameAdSlot} ${classNameAdChartEnd}`}
                classNameWhenActive={`${classNameAdSlot} ${classNameAdChartEnd}`}
                placeholderLabel="Ad Slot · Every 50 themes"
                format="horizontal"
              />
            ) : null}
          </div>
        );
      })}
      {visibleBlocks < totalBlocks ? (
        <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
      ) : null}
      {visibleBlocks < totalBlocks && needsManualLoadMore ? (
        <button
          type="button"
          onClick={() => setVisibleBlocks((b) => Math.min(totalBlocks, b + 2))}
          style={{ marginTop: 8 }}
        >
          Load more themes
        </button>
      ) : null}
    </>
  );
}
