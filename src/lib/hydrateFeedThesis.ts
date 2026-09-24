import { getThemeDetailCached } from "@/lib/getThemeDetailCached";
import type { ManifestHomeFeedEventV0 } from "@/types/manifest.v0";

function thesisSlug(evt: ManifestHomeFeedEventV0): string {
  return (
    String(evt.theme_slug || "").trim() ||
    String(evt.thesis_themes?.[0]?.slug || "").trim()
  );
}

/** True when a thesis card has prose to show (baked preview or hydrated map). */
export function feedEventHasThesisText(
  evt: ManifestHomeFeedEventV0,
  thesisBySlug?: Record<string, string>,
): boolean {
  if (evt.kind !== "text_table_update") return true;
  if (String(evt.thesis_preview || "").trim()) return true;
  const slug = thesisSlug(evt);
  if (slug && String(thesisBySlug?.[slug] || "").trim()) return true;
  return false;
}

/** Drop thesis-update rows with no thesis body — they should not appear as Thesis Updated. */
export function filterFeedEventsWithThesisText(
  events: ManifestHomeFeedEventV0[],
  thesisBySlug?: Record<string, string>,
): ManifestHomeFeedEventV0[] {
  return events.filter((e) => {
    if (e.kind !== "text_table_update") return true;
    if (String(e.thesis_preview || "").trim()) return true;
    const slug = thesisSlug(e);
    if (!slug) return false;
    // Only keep when we know there is prose (bundle / hydrate). Unknown = exclude
    // so empty Thesis Updated cards never ship.
    return Boolean(String(thesisBySlug?.[slug] || "").trim());
  });
}

/**
 * Load missing thesis blurbs into ``thesisBySlug`` for the given events only
 * (call with a first-paint / window slice — do not pass the full feed).
 * Empty string = confirmed missing.
 */
export async function hydrateThesisBySlugForFeedEvents(
  events: ManifestHomeFeedEventV0[],
  thesisBySlug: Record<string, string>,
  concurrency = 12,
): Promise<void> {
  const need = new Set<string>();
  for (const e of events) {
    if (e.kind !== "text_table_update") continue;
    if (String(e.thesis_preview || "").trim()) continue;
    const slug = thesisSlug(e);
    if (!slug) continue;
    if (Object.prototype.hasOwnProperty.call(thesisBySlug, slug)) continue;
    need.add(slug);
  }
  if (!need.size) return;

  const slugs = [...need];
  for (let i = 0; i < slugs.length; i += concurrency) {
    const batch = slugs.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (slug) => {
        const loaded = await getThemeDetailCached(slug).catch(() => null);
        thesisBySlug[slug] = String(loaded?.detail?.theme_thesis?.thesis || "").trim();
      }),
    );
  }
}
