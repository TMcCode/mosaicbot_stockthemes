"use client";

import { useMemo } from "react";

import { withoutSessionOnlyColumnsUnlessActive } from "@/lib/usMarketSession";

import { useUsMarketSessionNow } from "./useUsMarketSessionNow";

/** Show Premarket/Postmarket only during their active US ET sessions (client clock). */
export function useSessionVisibleColumns<T extends string>(cols: readonly T[]): T[] {
  const now = useUsMarketSessionNow();
  return useMemo(
    () => withoutSessionOnlyColumnsUnlessActive(cols, now),
    [cols, now],
  );
}
