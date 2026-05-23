/** Manifest / site publish `as_of` (ISO UTC instant) in US Eastern. */
export function formatSiteDataPublished(iso: string): string {
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
  return `${pick("month")} ${pick("day")}, ${pick("year")}, ${pick("hour")}:${pick("minute")} ${pick("dayPeriod")} ET`;
}

/** Intraday ETL completion for constituent price returns (same ET display). */
export const formatTickerPerformanceAsOf = formatSiteDataPublished;
