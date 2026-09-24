import type { WatchlistItemRow, WatchlistItemType } from "@/lib/watchlist/types";
import { HOME_RADAR_HOME_CARD_LIMIT } from "@/lib/watchlist/limitsCopy";

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

export function normalizeHomeRadarSlugs(slugs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of slugs) {
    const key = normalizeWatchlistKey("theme", raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= HOME_RADAR_HOME_CARD_LIMIT) break;
  }
  return out;
}

export async function fetchHomeRadarThemeSlugs(userId: string): Promise<string[]> {
  const supabase = await getWatchlistSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("home_radar_theme_slugs")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    // Column missing until migration 006 is applied — treat as no pins.
    return [];
  }
  const raw = (data as { home_radar_theme_slugs?: string[] | null } | null)?.home_radar_theme_slugs;
  return normalizeHomeRadarSlugs(Array.isArray(raw) ? raw : []);
}

export async function updateHomeRadarThemeSlugs(userId: string, slugs: string[]): Promise<void> {
  const supabase = await getWatchlistSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const next = normalizeHomeRadarSlugs(slugs);
  const { error } = await supabase
    .from("profiles")
    .update({ home_radar_theme_slugs: next })
    .eq("user_id", userId);
  if (error) {
    throw error;
  }
}
