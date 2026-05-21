export type HomeCommentaryEntryTypeV0 = "regular" | "nightly";

export type HomeCommentaryItemV0 = {
  date: string;
  note: string;
  ticker_theme?: string | null;
  entry_type?: HomeCommentaryEntryTypeV0;
  theme_slug?: string | null;
  image_url?: string | null;
};

export type HomeCommentaryV0 = {
  schema_version: 0;
  as_of: string;
  preview_days?: number;
  list_days?: number;
  items: HomeCommentaryItemV0[];
};
