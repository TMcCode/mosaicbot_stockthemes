import { splitThemeDisplayName } from "@/lib/rotationThemeLabel";
import type { ManifestHomeFeedEventV0, ManifestV0 } from "@/types/manifest.v0";

const DEFAULT_MIN_GROUP = 3;

export type FeedFlipperSlot = {
  /** Newest event in the group cluster (or the solo event). */
  lead: ManifestHomeFeedEventV0;
  /**
   * When length ≥ minGroup, UI shows radar-style ‹ n/N › arrows.
   * Ordered event_at desc. Null/undefined = single card.
   */
  siblings?: ManifestHomeFeedEventV0[] | null;
};

function themeName(evt: ManifestHomeFeedEventV0): string {
  return String(evt.theme_name || evt.title || "").trim();
}

/**
 * Group key for flipper collapse: manifest group_slug when known,
 * else colon prefix ("Auto Components '25"), else solo.
 * Same kind only — thesis clusters with thesis, membership with membership.
 */
export function feedEventGroupKey(
  evt: ManifestHomeFeedEventV0,
  groupSlugByThemeSlug: Map<string, string>,
): string {
  const kind = String(evt.kind || "update");
  const slug = String(evt.theme_slug || "").trim();
  if (slug) {
    const gSlug = groupSlugByThemeSlug.get(slug);
    if (gSlug) return `${kind}::slug:${gSlug}`;
  }
  const { groupPrefix } = splitThemeDisplayName(themeName(evt));
  if (groupPrefix) return `${kind}::prefix:${groupPrefix.toLowerCase()}`;
  return `${kind}::solo:${slug || themeName(evt) || evt.event_at}`;
}

function buildGroupSlugByThemeSlug(manifest: ManifestV0): Map<string, string> {
  const map = new Map<string, string>();
  for (const t of manifest.themes || []) {
    const slug = String(t.slug || "").trim();
    const g = String(t.group_slug || "").trim();
    if (slug && g) map.set(slug, g);
  }
  return map;
}

/**
 * ≥minGroup events sharing the same group (+ kind) → one flipper slot.
 * Preserves first-seen bucket order (date-desc list). Idempotent.
 */
export function collapseFeedGroupFlippers(
  events: ManifestHomeFeedEventV0[],
  manifest: ManifestV0,
  minGroup: number = DEFAULT_MIN_GROUP,
): FeedFlipperSlot[] {
  const threshold = Math.max(2, minGroup);
  const groupSlugByThemeSlug = buildGroupSlugByThemeSlug(manifest);

  const byKey = new Map<string, ManifestHomeFeedEventV0[]>();
  const order: string[] = [];
  for (const evt of events) {
    const key = feedEventGroupKey(evt, groupSlugByThemeSlug);
    if (!byKey.has(key)) {
      byKey.set(key, []);
      order.push(key);
    }
    byKey.get(key)!.push(evt);
  }

  const out: FeedFlipperSlot[] = [];
  for (const key of order) {
    const members = byKey.get(key) || [];
    const sorted = [...members].sort((a, b) =>
      String(b.event_at).localeCompare(String(a.event_at)),
    );
    const isFlipper = !key.includes("::solo:") && sorted.length >= threshold;
    if (isFlipper) {
      out.push({ lead: sorted[0], siblings: sorted });
    } else {
      for (const evt of sorted) {
        out.push({ lead: evt, siblings: null });
      }
    }
  }
  return out;
}
