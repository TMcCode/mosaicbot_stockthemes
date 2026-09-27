import type { FeedFlipperSlot } from "@/lib/collapseFeedGroupFlippers";
import type { ManifestHomeFeedEventV0, ManifestHomeFeedHoldingV0 } from "@/types/manifest.v0";

function stripNotes(
  items: ManifestHomeFeedHoldingV0[] | undefined,
): ManifestHomeFeedHoldingV0[] | undefined {
  if (!Array.isArray(items)) return items;
  return items.map((h) => ({
    ticker: h.ticker,
    weight: h.weight,
    logo_url: h.logo_url,
    action: h.action,
  }));
}

function slimEvent(e: ManifestHomeFeedEventV0): ManifestHomeFeedEventV0 {
  return {
    ...e,
    holdings_preview: stripNotes(e.holdings_preview),
    membership_preview: stripNotes(e.membership_preview),
  };
}

/**
 * Feed cards render ticker / weight / logo / action only. Per-ticker `ticker_note`
 * paragraphs are ~45% of `/feed` HTML when serialized into the RSC payload.
 */
export function slimFeedSlotsForClient(slots: FeedFlipperSlot[]): FeedFlipperSlot[] {
  return slots.map((slot) => ({
    lead: slimEvent(slot.lead),
    siblings: slot.siblings ? slot.siblings.map(slimEvent) : slot.siblings,
  }));
}
