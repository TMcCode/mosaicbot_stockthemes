import { HomeExplorePaths } from "@/components/HomeExplorePaths";
import { getHomeExplorePathsCached } from "@/lib/getHomeExplorePathsCached";

/** Async island — keeps explore JSON off the sync hero path. */
export async function HomeExplorePathsSlot() {
  const explorePathsRes = await getHomeExplorePathsCached().catch(() => null);
  const bundle = explorePathsRes?.bundle;
  if (!bundle?.paths?.length) return null;

  return (
    <HomeExplorePaths
      paths={bundle.paths}
      rotateSeconds={bundle.rotate_seconds ?? 10}
      visibleCount={bundle.visible_count ?? 3}
    />
  );
}
