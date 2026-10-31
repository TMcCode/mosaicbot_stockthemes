import type { Metadata } from "next";
import { Suspense } from "react";

import { DetailRouteLoading } from "@/components/DetailRouteLoading";
import { StockShellClient } from "@/components/StockShellClient";

export const metadata: Metadata = {
  title: "Stock",
  // Pretty `/stocks/TICKER` is canonical (Function meta). Shell is the runtime host only.
  robots: { index: false, follow: true },
};

/** Static export shell for on-demand `/stocks/[ticker]` (Pages Function entry). */
export default function StockOnDemandShellPage() {
  return (
    <Suspense fallback={<DetailRouteLoading label="Loading stock…" />}>
      <StockShellClient />
    </Suspense>
  );
}
