import { stockPagePath } from "@/lib/stockPagePath";

/**
 * Full document navigation to a stock page.
 *
 * Required for the long-tail universe: most `/stocks/[ticker]` HTML is not
 * pre-baked (CF Pages 20k file cap). Soft Next.js routing 404s those paths;
 * a hard navigation hits the Pages Function → `__shell` runtime.
 */
export function navigateToStockPage(ticker: string): void {
  const t = String(ticker || "").trim();
  if (!t || typeof window === "undefined") return;
  window.location.assign(stockPagePath(t));
}
