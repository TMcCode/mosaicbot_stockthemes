import { cache } from "react";

import { loadHomeFeed, type HomeFeedLoadResult } from "@/lib/loadHomeFeed";

export const getHomeFeedCached = cache(async (): Promise<HomeFeedLoadResult | null> => {
  return loadHomeFeed();
});
