import { watchlistFullErrorMessage } from "@/lib/watchlist/limitsCopy";

/** Map Supabase/Postgres errors to short UI copy. */
export function formatWatchlistError(message: string | undefined): string {
  const m = (message ?? "").trim();
  if (!m) {
    return "Could not update watchlist.";
  }
  if (m.includes("watchlist limit reached")) {
    const kind = m.includes("ticker") ? "tickers" : "themes";
    return watchlistFullErrorMessage(kind);
  }
  if (m.includes("duplicate key") || m.includes("unique constraint")) {
    return "Already on your watchlist.";
  }
  return m;
}
