import { MyWatchlistPageClient } from "@/app/my/MyWatchlistPageClient";
import { getCompareThemesCached } from "@/lib/getCompareThemesCached";
import { getManifestCached } from "@/lib/getManifestCached";
import { prepareMyWatchlistCompareData } from "@/lib/prepareMyWatchlistCompareData";

export default async function MyWatchlistPage() {
  const [{ manifest }, compareRes] = await Promise.all([
    getManifestCached(),
    getCompareThemesCached(),
  ]);
  const compareData = prepareMyWatchlistCompareData(
    compareRes,
    manifest.selected_dates,
  );

  return <MyWatchlistPageClient compareData={compareData} />;
}
