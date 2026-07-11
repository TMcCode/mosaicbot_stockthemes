import { cache } from "react";

import { loadFactorSpreads, type FactorSpreadsLoadResult } from "@/lib/loadFactorSpreads";

export const getFactorSpreadsCached = cache(async (): Promise<FactorSpreadsLoadResult | null> => {
  return loadFactorSpreads();
});
