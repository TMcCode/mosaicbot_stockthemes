export type HomeCommentaryEntryTypeV0 = "regular" | "nightly";

export type HomeCommentaryTagV0 = {
  kind: "theme" | "ticker";
  label: string;
  slug?: string | null;
};

export type HomeCommentaryItemV0 = {
  id?: string;
  date: string;
  note: string;
  ticker_theme?: string | null;
  entry_type?: HomeCommentaryEntryTypeV0;
  theme_slug?: string | null;
  image_url?: string | null;
  /** Prefer this when present; falls back to image_url. */
  image_urls?: string[];
  link_url?: string | null;
  link_title?: string | null;
  tags?: HomeCommentaryTagV0[];
  source?: "timbot" | "admin";
};

export type HomeCommentaryV0 = {
  schema_version: 0;
  as_of: string;
  preview_days?: number;
  list_days?: number;
  items: HomeCommentaryItemV0[];
};
