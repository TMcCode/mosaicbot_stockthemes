/** Manifest / site publish `as_of` (ISO UTC instant) in US Eastern. */
export function formatSiteDataPublished(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    d.toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "medium",
      timeStyle: "short",
    }) + " ET"
  );
}

/** Intraday ETL completion for constituent price returns (same ET display). */
export const formatTickerPerformanceAsOf = formatSiteDataPublished;
