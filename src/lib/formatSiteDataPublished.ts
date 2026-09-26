/** Manifest / site publish `as_of` (ISO UTC instant) in US Eastern. */
export function formatSiteDataPublished(
  iso: string,
  opts?: {
    /** Default true. Set false for tight chips. */
    includeEt?: boolean;
    /** Short home-stat form: `Sep 26 · 3:45 AM` (no year / ET). */
    compact?: boolean;
  },
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // formatToParts — stable SSR + browser (toLocaleString date+time uses "at" in some runtimes).
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  if (opts?.compact) {
    return `${pick("month")} ${pick("day")} · ${pick("hour")}:${pick("minute")} ${pick("dayPeriod")}`;
  }
  const base = `${pick("month")} ${pick("day")}, ${pick("year")}, ${pick("hour")}:${pick("minute")} ${pick("dayPeriod")}`;
  return opts?.includeEt === false ? base : `${base} ET`;
}

/** Intraday ETL completion for constituent price returns (same ET display). */
export const formatTickerPerformanceAsOf = formatSiteDataPublished;
