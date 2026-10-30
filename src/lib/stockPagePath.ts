/** Public stock lens path — preserve exchange suffixes (e.g. `0700.HK`). */
export function stockPagePath(ticker: string): string {
  const t = String(ticker || "").trim();
  if (!t) return "/stocks";
  return `/stocks/${encodeURIComponent(t)}`;
}
