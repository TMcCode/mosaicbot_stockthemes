import { cache } from "react";

import { loadMostTalkedAbout, type MostTalkedAboutLoadResult } from "@/lib/loadMostTalkedAbout";

export const getMostTalkedAboutCached = cache(
  async (): Promise<MostTalkedAboutLoadResult | null> => {
    return loadMostTalkedAbout();
  },
);
