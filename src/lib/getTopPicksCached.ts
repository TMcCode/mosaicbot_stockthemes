import { cache } from "react";

import { loadTopPicks, type TopPicksLoadResult } from "@/lib/loadTopPicks";

export const getTopPicksCached = cache(async (): Promise<TopPicksLoadResult | null> => {
  return loadTopPicks();
});
