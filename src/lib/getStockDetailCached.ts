import { cache } from "react";

import { loadStockDetail, type StockDetailLoadResult } from "@/lib/loadStockDetail";

export const getStockDetailCached = cache(
  async (ticker: string): Promise<StockDetailLoadResult | null> => {
    return loadStockDetail(ticker);
  },
);
