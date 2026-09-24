import { cache } from "react";

import { loadHomeRadar, type HomeRadarLoadResult } from "@/lib/loadHomeRadar";

export const getHomeRadarCached = cache(async (): Promise<HomeRadarLoadResult | null> => {
  return loadHomeRadar();
});
