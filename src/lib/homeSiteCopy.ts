/** Short homepage footer copy (AdSense §1) — not the full About page. */

export const HOME_SITE_HEADING = "About the theme";

export const SITE_PRODUCT_SUMMARY =
  "Built to make thematic markets readable—how themes move prices, and how prices reshape themes. Explore a theme’s performance, who’s in the basket, and what factors sit behind the move. We hope you find it useful.";

export const HOME_SITE_SUMMARY = SITE_PRODUCT_SUMMARY;

export const HOME_SITE_CONTACT_LABEL = "Please contact us with any feedback.";

export const HOME_SITE_CONTACT_HREF = "mailto:hello@stockthemes.ai";

export const HOME_SITE_BULLETS: string[] = [
  "Themes track one investable story; groups bundle related themes under a macro angle.",
  "Constituents are chosen from public filings and earnings—not generic LLM keyword lists.",
  "For construction rules, return math, and data limits, see the methodology page.",
];

export const HOME_SITE_DISCLAIMER =
  "Not investment advice. Data may be delayed or revised; thematic labels involve judgment.";

export function homeSiteJsonDescription(): string {
  return [HOME_SITE_SUMMARY, HOME_SITE_CONTACT_LABEL, ...HOME_SITE_BULLETS].join(" ");
}
