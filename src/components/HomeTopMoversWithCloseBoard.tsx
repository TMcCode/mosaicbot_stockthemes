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
 * Top movers + optional post-close board. Board data/JS load only when the
 * close→4a window is open (or ``/?close_leaders=1``) — nothing in SSR HTML.
 */
export function HomeTopMoversWithCloseBoard({
  items,
  period,
  asOfLabel,
  tickerPerformanceAsOf,
  serverCompare = null,
  serverTopMovers = null,
}: Props) {
  const [board, setBoard] = useState<CloseMoversBoardPayload | null>(null);
  const [wantBoard, setWantBoard] = useState(false);

  useEffect(() => {
    const sync = () => {
      setWantBoard(isCloseMoversBoardWindow() || wantsCloseLeadersPreview());
    };
    sync();
    const id = window.setInterval(sync, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!wantBoard || period === "10D") return;
    let cancelled = false;
    void (async () => {
      const news = await fetchRadarNewsBrowser();
      if (cancelled) return;
      setBoard(buildCloseMoversBoard(items, news, { n: 10, maxHeadlines: 2 }));
    })();
    return () => {
      cancelled = true;
    };
  }, [wantBoard, period, items]);

  const activeBoard = wantBoard && period !== "10D" ? board : null;

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
