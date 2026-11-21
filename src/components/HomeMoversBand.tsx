import { HomeCommentaryPreview } from "@/components/HomeCommentaryPreview";
import { HomeTopMoversWithCloseBoard } from "@/components/HomeTopMoversWithCloseBoard";
import { homeTopMoversTickerPeriod } from "@/lib/buildTopMoversTicker";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import { getHomeTopMoversCached } from "@/lib/getHomeTopMoversCached";
import { getManifestCached } from "@/lib/getManifestCached";
import { loadHomeCommentary } from "@/lib/loadHomeCommentary";
import { pickHomeTopMovers } from "@/lib/pickHomeTopMovers";

/**
 * First below-fold band — commentary + top movers from the slim home_top_movers sidecar
 * (not the ~1.4MB compare_themes corpus).
 */
export async function HomeMoversBand() {
  const [{ manifest }, topMoversRes, commentaryRes] = await Promise.all([
    getManifestCached(),
    getHomeTopMoversCached().catch(() => null),
    loadHomeCommentary(),
  ]);

  const topMoversPeriod = homeTopMoversTickerPeriod();
  const topMoversTicker = pickHomeTopMovers(topMoversRes?.bundle, topMoversPeriod);

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
          topMoversRes?.bundle?.as_of
            ? { as_of: topMoversRes.bundle.as_of }
            : manifest.as_of
              ? { as_of: manifest.as_of }
              : null
        }
        serverTopMovers={topMoversRes?.bundle ?? null}
      />
    </>
  );
}
