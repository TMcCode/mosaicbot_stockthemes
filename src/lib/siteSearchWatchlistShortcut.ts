/** True when the query looks like “watchlist” / “my watchlist” (prefix-friendly). */
export function matchesWatchlistSearchQuery(query: string): boolean {
  const n = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (n.length < 3) return false;
  if ("watchlist".startsWith(n)) return true;
  if (n.startsWith("watchlist")) return true;
  if ("my watchlist".startsWith(n)) return true;
  if (n.startsWith("my watchlist")) return true;
  return false;
}

/** Theme watchlist page (signed-in). */
export const WATCHLIST_SEARCH_HREF = "/my";
