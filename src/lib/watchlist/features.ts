/**
 * Ticker watchlist UI (search ☆, `/my` ticker tab).
 *
 * Public `/stocks/[ticker]` is live (see `docs/STOCK_PAGES_IMPLEMENTATION_PLAN.md`).
 * Keep this false until `compare_tickers.v0.json` ships from ETL and `/my` ticker tab is wired.
 * Schema + API already accept `item_type=ticker`.
 */
export const WATCHLIST_TICKERS_UI_ENABLED = false;
