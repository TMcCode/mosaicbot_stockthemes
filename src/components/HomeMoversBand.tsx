import { HomeCommentaryPreview } from "@/components/HomeCommentaryPreview";
import { HomeTopMoversWithCloseBoard } from "@/components/HomeTopMoversWithCloseBoard";
import {
  buildTopMoversTickerItems,
  homeTopMoversTickerPeriod,
} from "@/lib/buildTopMoversTicker";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import { getCompareThemesCached } from "@/lib/getCompareThemesCached";
import { getHomeTopMoversCached } from "@/lib/getHomeTopMoversCached";
import { getManifestCached } from "@/lib/getManifestCached";
import { loadHomeCommentary } from "@/lib/loadHomeCommentary";
import { pickHomeTopMovers } from "@/lib/pickHomeTopMovers";

/**
 * First below-fold band — compare + commentary only (no radar/feed/motions).
 * Streams sooner than the heavy deferred sections.
 */
export async function HomeMoversBand() {
  const [{ manifest }, compareRes, commentaryRes] = await Promise.all([
    getManifestCached(),
    getCompareThemesCached(),
    loadHomeCommentary(),
  ]);

  const topMoversPeriod = homeTopMoversTickerPeriod();
  const fromCompare = buildTopMoversTickerItems(compareRes?.bundle?.rows ?? [], {
    period: topMoversPeriod,
  });
  const topMoversRes =
    fromCompare.length > 0 ? null : await getHomeTopMoversCached().catch(() => null);
  const topMoversTicker =
    fromCompare.length > 0
      ? fromCompare
      : pickHomeTopMovers(topMoversRes?.bundle, topMoversPeriod);

  return (
    <>
      <HomeCommentaryPreview
        initialItems={commentaryRes?.commentary.items ?? []}
        previewDays={commentaryRes?.commentary.preview_days ?? 7}
      />
      <HomeTopMoversWithCloseBoard
        items={topMoversTicker}
        period={topMoversPeriod}
        asOfLabel={manifest.as_of ? formatSiteDataPublished(manifest.as_of) : undefined}
        tickerPerformanceAsOf={manifest.ticker_performance_as_of}
        serverCompare={
          compareRes?.bundle?.as_of ? { as_of: compareRes.bundle.as_of } : null
        }
        serverTopMovers={topMoversRes?.bundle ?? null}
      />
    </>
  );
}
