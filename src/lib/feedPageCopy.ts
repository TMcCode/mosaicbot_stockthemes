/** Crawlable intro for `/feed` (AdSense §10). */

export const FEED_PAGE_TITLE = "Theme activity feed";

export const FEED_PAGE_INTRO_LEAD = [
  "This page lists changes to stockthemes.ai theme baskets: new themes, constituent adds and removes, weight updates, and thesis or research-note refreshes.",
  "Events are generated when our data pipeline publishes an updated manifest—typically after the daily ETL run, with additional updates when intraday jobs refresh holdings or performance.",
  "The homepage shows a short recent slice; here you can browse the full history.",
] as const;

export function feedPageMetadataDescription(): string {
  return (
    "Full changelog of new themes, constituent changes, weight updates, and thesis refreshes on stockthemes.ai."
  );
}
