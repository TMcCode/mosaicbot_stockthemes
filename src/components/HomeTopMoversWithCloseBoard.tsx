"use client";

import { useEffect, useState } from "react";

import { HomeTopMoversTickerLive } from "@/components/HomeTopMoversTickerLive";
import {
  buildCloseMoversBoard,
  type CloseMoversBoardPayload,
} from "@/lib/buildCloseMoversBoard";
import type { TopMoverTickerItem, TopMoverTickerPeriod } from "@/lib/buildTopMoversTicker";
import type { ServerCompareSeed } from "@/hooks/useLiveCompareBundles";
import { fetchRadarNewsBrowser } from "@/lib/fetchRadarNewsBrowser";
import type { HomeTopMoversV0 } from "@/types/home_top_movers.v0";

type Props = {
  items: TopMoverTickerItem[];
  period?: TopMoverTickerPeriod;
  asOfLabel?: string;
  tickerPerformanceAsOf?: string;
  serverCompare?: ServerCompareSeed;
  serverTopMovers?: HomeTopMoversV0 | null;
  /** Prebuilt when the close window is open; null = marquee only (unless preview). */
  closeBoard: CloseMoversBoardPayload | null;
};

function wantsCloseLeadersPreview(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("close_leaders") === "1";
  } catch {
    return false;
  }
}

/**
 * Top movers shell with optional post-close top/bottom board (same card).
 * Preview anytime: ``/?close_leaders=1``.
 */
export function HomeTopMoversWithCloseBoard({
  items,
  period,
  asOfLabel,
  tickerPerformanceAsOf,
  serverCompare = null,
  serverTopMovers = null,
  closeBoard,
}: Props) {
  const [previewBoard, setPreviewBoard] = useState<CloseMoversBoardPayload | null>(null);

  useEffect(() => {
    if (closeBoard || !wantsCloseLeadersPreview()) return;
    let cancelled = false;
    void (async () => {
      const news = await fetchRadarNewsBrowser();
      if (cancelled) return;
      setPreviewBoard(
        buildCloseMoversBoard(items, news, { n: 10, maxHeadlines: 2 }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [closeBoard, items]);

  return (
    <HomeTopMoversTickerLive
      items={items}
      period={period}
      asOfLabel={asOfLabel}
      tickerPerformanceAsOf={tickerPerformanceAsOf}
      serverCompare={serverCompare}
      serverTopMovers={serverTopMovers}
      closeBoard={closeBoard ?? previewBoard}
    />
  );
}
