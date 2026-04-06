import { cache } from "react";

import { loadHomeTrending, type HomeTrendingLoadResult } from "@/lib/loadHomeTrending";

export const getHomeTrendingCached = cache(async (): Promise<HomeTrendingLoadResult | null> => {
  return loadHomeTrending();
});
