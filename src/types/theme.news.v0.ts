/** Per-theme news feed published by MosaicBot (`news_radar/theme_news_feed.py`). */

export type ThemeNewsItemV0 = {
  id: string;
  url: string;
  title: string;
  source?: string | null;
  /** YYYY-MM-DD (article publish date, or first-seen when missing). */
  date: string;
  /** Picked in TimBot (editorial). */
  picked?: boolean;
  /** Shown on a stockthemes Narrative Radar card. */
  on_site?: boolean;
  note?: string;
  tickers?: string[];
};

export type ThemeNewsIndexV0 = {
  schema_version: "theme.news.index.v0";
  slug: string;
  theme_name: string;
  total: number;
  /** Newest first. */
  months: { month: string; count: number }[];
  latest: ThemeNewsItemV0[];
};

export type ThemeNewsMonthV0 = {
  schema_version: "theme.news.month.v0";
  slug: string;
  month: string;
  items: ThemeNewsItemV0[];
};
