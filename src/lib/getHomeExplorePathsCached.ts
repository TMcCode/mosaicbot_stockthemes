import { cache } from "react";

import {
  loadHomeExplorePaths,
  type HomeExplorePathsLoadResult,
} from "@/lib/loadHomeExplorePaths";

export const getHomeExplorePathsCached = cache(
  async (): Promise<HomeExplorePathsLoadResult | null> => {
    return loadHomeExplorePaths();
  },
);
