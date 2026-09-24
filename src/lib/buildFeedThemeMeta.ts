import type { FeedFlipperSlot } from "@/lib/collapseFeedGroupFlippers";
import {
  normalizeCompareSpySector,
  orderCompareSectorOptions,
} from "@/lib/compareSectorFilter";
import type { ManifestV0 } from "@/types/manifest.v0";

export type FeedThemeMeta = {
  groupName?: string | null;
  groupSlug?: string | null;
  tickerCount?: number | null;
  /** Normalized spy sector from the theme's group (manifest-baked). */
  spySector?: string | null;
};

/** Theme slug → meta including sector, from already-published manifest (no live fetch). */
export function buildFeedThemeMetaBySlug(manifest: ManifestV0): Record<string, FeedThemeMeta> {
  const groupNameBySlug = new Map(
    (manifest.groups || []).map((g) => [String(g.slug || "").trim(), String(g.name || "").trim()]),
  );
  const sectorByGroupSlug = new Map(
    (manifest.groups || []).map((g) => [
      String(g.slug || "").trim(),
      normalizeCompareSpySector(g.spy_sector),
    ]),
  );
  const out: Record<string, FeedThemeMeta> = {};
  for (const t of manifest.themes || []) {
    const slug = String(t.slug || "").trim();
    if (!slug) continue;
    const groupSlug = String(t.group_slug || "").trim() || null;
    out[slug] = {
      groupSlug,
      groupName: groupSlug ? groupNameBySlug.get(groupSlug) || null : null,
      tickerCount: t.ticker_count ?? null,
      spySector: groupSlug
        ? sectorByGroupSlug.get(groupSlug) || normalizeCompareSpySector(null)
        : normalizeCompareSpySector(null),
    };
  }
  return out;
}

/** Keep only slugs that appear in feed/home slots (smaller RSC → client payload). */
export function slimFeedThemeMetaForSlots(
  themeMetaBySlug: Record<string, FeedThemeMeta>,
  slots: Iterable<FeedFlipperSlot>,
): Record<string, FeedThemeMeta> {
  const want = new Set<string>();
  for (const slot of slots) {
    const members = slot.siblings?.length ? slot.siblings : [slot.lead];
    for (const e of members) {
      const slug = String(e.theme_slug || "").trim();
      if (slug) want.add(slug);
      for (const t of e.thesis_themes || []) {
        const s = String(t.slug || "").trim();
        if (s) want.add(s);
      }
    }
  }
  if (!want.size) return {};
  const out: Record<string, FeedThemeMeta> = {};
  for (const slug of want) {
    const meta = themeMetaBySlug[slug];
    if (meta) out[slug] = meta;
  }
  return out;
}

export function feedSlotSpySector(
  slot: FeedFlipperSlot,
  themeMetaBySlug?: Record<string, FeedThemeMeta>,
): string {
  const members = slot.siblings?.length ? slot.siblings : [slot.lead];
  for (const e of members) {
    const slug = String(e.theme_slug || "").trim();
    if (!slug) continue;
    const sec = themeMetaBySlug?.[slug]?.spySector;
    if (sec) return normalizeCompareSpySector(sec);
  }
  return normalizeCompareSpySector(null);
}

/** Sector options that actually appear in the current feed window. */
export function feedSectorOptionsFromEvents(
  events: FeedFlipperSlot[],
  themeMetaBySlug?: Record<string, FeedThemeMeta>,
): string[] {
  const set = new Set<string>();
  for (const slot of events) {
    set.add(feedSlotSpySector(slot, themeMetaBySlug));
  }
  return orderCompareSectorOptions(set);
}
