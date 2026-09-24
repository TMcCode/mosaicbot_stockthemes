/** Homepage compact: "Sep 23" (stable SSR + browser). */
export function formatFeedDateShort(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).formatToParts(d);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("month")} ${pick("day")}`;
}

/** Full feed page: "Sep 23, 2:12 PM" (stable SSR + browser — no locale "at"). */
export function formatFeedDateLong(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("month")} ${pick("day")}, ${pick("hour")}:${pick("minute")} ${pick("dayPeriod")}`;
}
