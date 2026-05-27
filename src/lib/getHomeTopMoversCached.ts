import { cache } from "react";

import { loadHomeTopMovers, type HomeTopMoversLoadResult } from "@/lib/loadHomeTopMovers";

export const getHomeTopMoversCached = cache(async (): Promise<HomeTopMoversLoadResult | null> => {
  return loadHomeTopMovers();
});
