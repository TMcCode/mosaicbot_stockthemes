"use client";

import { useEffect, useState } from "react";

import { HomeTopMoversTickerLive } from "@/components/HomeTopMoversTickerLive";
import {
  buildCloseMoversBoard,
  type CloseMoversBoardPayload,
} from "@/lib/buildCloseMoversBoard";
import { isCloseMoversBoardWindow } from "@/lib/closeMoversBoardWindow";
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
  /** SSR weekday 1D payload; client shows only in close→4a window (or preview). */
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
 * Visibility is client-gated (static export). Preview: ``/?close_leaders=1``.
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
  const [inCloseWindow, setInCloseWindow] = useState(false);

  useEffect(() => {
    const sync = () => setInCloseWindow(isCloseMoversBoardWindow());
    sync();
    const id = window.setInterval(sync, 60_000);
    return () => window.clearInterval(id);
  }, []);

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

  const preview = wantsCloseLeadersPreview();
  const activeBoard =
    inCloseWindow || preview ? (closeBoard ?? previewBoard) : null;

  return (
    <HomeTopMoversTickerLive
      items={items}
      period={period}
      asOfLabel={asOfLabel}
      tickerPerformanceAsOf={tickerPerformanceAsOf}
      serverCompare={serverCompare}
      serverTopMovers={serverTopMovers}
      closeBoard={activeBoard}
    />
  );
}
