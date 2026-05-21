/** Short homepage footer copy (AdSense §1) — not the full About page. */

export const HOME_SITE_HEADING = "About this site";

export const HOME_SITE_SUMMARY =
  "Hand-curated theme baskets and groups for narrative equity research—compare performance, holdings, and updates.";

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
