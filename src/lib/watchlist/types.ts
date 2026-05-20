export type WatchlistItemType = "theme" | "ticker";

export type WatchlistItemRow = {
  id: string;
  item_type: WatchlistItemType;
  item_key: string;
  sort_order: number;
  created_at: string;
};
