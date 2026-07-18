import type { WatchlistItemRow, WatchlistItemType } from "@/lib/watchlist/types";

async function getWatchlistSupabase() {
  const { getBrowserSupabase } = await import("@/lib/supabase/browserClient");
  return getBrowserSupabase();
}

export async function fetchWatchlistItems(userId: string): Promise<WatchlistItemRow[]> {
  const supabase = await getWatchlistSupabase();
  if (!supabase) {
    return [];
  }
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("id, item_type, item_key, sort_order, created_at")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as WatchlistItemRow[];
}

export async function insertWatchlistItem(
  userId: string,
  itemType: WatchlistItemType,
  itemKey: string,
): Promise<void> {
  const supabase = await getWatchlistSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const { error } = await supabase.from("watchlist_items").insert({
    user_id: userId,
    item_type: itemType,
    item_key: itemKey,
  });
  if (error) {
    throw error;
  }
}

export async function deleteWatchlistItem(
  userId: string,
  itemType: WatchlistItemType,
  itemKey: string,
): Promise<void> {
  const supabase = await getWatchlistSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const { error } = await supabase
    .from("watchlist_items")
    .delete()
    .eq("user_id", userId)
    .eq("item_type", itemType)
    .eq("item_key", itemType === "ticker" ? itemKey.toUpperCase() : itemKey.toLowerCase());
  if (error) {
    throw error;
  }
}

/** Normalize keys the same way as the DB trigger (for client-side Set lookups). */
export function normalizeWatchlistKey(itemType: WatchlistItemType, itemKey: string): string {
  const trimmed = itemKey.trim();
  return itemType === "ticker" ? trimmed.toUpperCase() : trimmed.toLowerCase();
}
