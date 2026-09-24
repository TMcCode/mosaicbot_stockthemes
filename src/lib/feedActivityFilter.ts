import { feedKindLabel } from "@/components/FeedEventCardBody";
import type { FeedFlipperSlot } from "@/lib/collapseFeedGroupFlippers";
import type { ManifestHomeFeedEventV0 } from "@/types/manifest.v0";

export type FeedActivityKind = ManifestHomeFeedEventV0["kind"];

/** Preferred chip order (only kinds present in the feed are shown). */
export const FEED_ACTIVITY_KIND_ORDER: readonly FeedActivityKind[] = [
  "text_table_update",
  "theme_updated",
  "theme_new",
  "theme_deleted",
  "theme_change",
] as const;

/** Compact chip labels (card badges stay longer via feedKindLabel). */
export function feedActivityChipLabel(kind: FeedActivityKind): string {
  switch (kind) {
    case "text_table_update":
      return "Thesis";
    case "theme_updated":
      return "Membership Updated";
    case "theme_weights_updated":
      return "Weights";
    case "theme_new":
      return "New";
    case "theme_deleted":
      return "Deleted";
    case "theme_change":
      return "Change";
    default:
      return feedKindLabel(kind);
  }
}

export function feedSlotKinds(slot: FeedFlipperSlot): FeedActivityKind[] {
  const members = slot.siblings?.length ? slot.siblings : [slot.lead];
  const out: FeedActivityKind[] = [];
  const seen = new Set<string>();
  for (const e of members) {
    const k = e.kind;
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/** Activity kinds that appear in the current feed window, ordered. */
export function feedActivityOptionsFromEvents(events: FeedFlipperSlot[]): FeedActivityKind[] {
  const present = new Set<FeedActivityKind>();
  for (const slot of events) {
    for (const k of feedSlotKinds(slot)) present.add(k);
  }
  const ordered = FEED_ACTIVITY_KIND_ORDER.filter((k) => present.has(k));
  const rest = [...present]
    .filter((k) => !FEED_ACTIVITY_KIND_ORDER.includes(k))
    .sort((a, b) => a.localeCompare(b));
  return [...ordered, ...rest];
}

export function isFeedActivityFilterInactive(
  selected: FeedActivityKind[],
  options: FeedActivityKind[],
): boolean {
  if (options.length === 0) return true;
  if (selected.length >= options.length) return true;
  return false;
}
