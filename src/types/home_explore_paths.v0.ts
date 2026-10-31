/** Homepage search-card explore chips (`home_explore_paths.v0.json`). */

export type HomeExplorePathEntityV0 = {
  kind: "theme" | "ticker" | "group";
  slug?: string;
  ticker?: string;
};

export type HomeExplorePathKindV0 =
  | "theme"
  | "ticker"
  | "overlay"
  | "evergreen"
  | "news";

export type HomeExplorePathV0 = {
  id: string;
  label: string;
  href: string;
  kind: HomeExplorePathKindV0;
  source?: string;
  entities?: HomeExplorePathEntityV0[];
  /** Provenance only — chip href is always /themes/<slug>, never news.url. */
  news?: {
    title?: string | null;
    url?: string | null;
    published_at?: string | null;
    source_name?: string | null;
    first_seen_as_of?: string | null;
  };
};

export type HomeExplorePathsV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  rotate_seconds?: number;
  visible_count?: number;
  paths: HomeExplorePathV0[];
  mix?: {
    news?: number;
    theme?: number;
    ticker?: number;
    overlay?: number;
    evergreen?: number;
    total?: number;
  };
};
