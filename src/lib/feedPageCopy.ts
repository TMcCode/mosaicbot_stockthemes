/** Crawlable intro for `/feed` (AdSense §10). */

export const FEED_PAGE_TITLE = "Theme activity feed";

/** Hero punchline under the title — keep short. */
export const FEED_PAGE_PUNCHLINE =
  "New themes, membership moves, weight edits, and thesis refreshes.";

/** One secondary line under the punchline. */
export const FEED_PAGE_INTRO_SECONDARY =
  "Tracks the last ~10 days of basket changes.";

export function feedPageMetadataDescription(): string {
  return (
    "Full changelog of new themes, constituent changes, weight updates, and thesis refreshes on stockthemes.ai."
  );
}
