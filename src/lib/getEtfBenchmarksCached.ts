import { cache } from "react";

import { loadEtfBenchmarks, type EtfBenchmarksLoadResult } from "@/lib/loadEtfBenchmarks";

export const getEtfBenchmarksCached = cache(async (): Promise<EtfBenchmarksLoadResult | null> => {
  return loadEtfBenchmarks();
});
