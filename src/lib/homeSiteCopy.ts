/** Short homepage footer copy (AdSense §1) — not the full About page. */

export const HOME_SITE_HEADING = "About this site";

export const SITE_PRODUCT_SUMMARY =
  "stockthemes.ai takes those themes and makes them digestible and investable by creating weighted baskets of public companies most exposed. I curate them from filings and earnings, track performance daily, and publish when constituents change. It's a map of thematic equity—not a fund, not advice, just structured research.";

export const HOME_SITE_SUMMARY = SITE_PRODUCT_SUMMARY;

export const HOME_SITE_BULLETS: string[] = [
  "Themes track one investable story; groups bundle related themes under a macro angle.",
  "Constituents are chosen from public filings and earnings—not generic LLM keyword lists.",
  "For construction rules, return math, and data limits, see the methodology page.",
];

export const HOME_SITE_DISCLAIMER =
  "Not investment advice. Data may be delayed or revised; thematic labels involve judgment.";

export function homeSiteJsonDescription(): string {
  return [HOME_SITE_SUMMARY, ...HOME_SITE_BULLETS].join(" ");
}
