import type { SearchIndexV0 } from "@/types/search_index.v0";

/** Restore denormalized labels omitted from the compact public search artifact. */
export function hydrateSearchIndex(index: SearchIndexV0): SearchIndexV0 {
  const groupNameBySlug = new Map(index.groups.map((group) => [group.slug, group.name]));
  const themes = index.themes.map((theme) => ({
    ...theme,
    group_name:
      theme.group_name ??
      (theme.group_slug ? groupNameBySlug.get(theme.group_slug) ?? null : null),
    aliases: theme.aliases ?? [],
  }));
  const themeNameBySlug = new Map(themes.map((theme) => [theme.slug, theme.name]));
  const tickers = index.tickers.map((ticker) => ({
    ...ticker,
    theme_names:
      ticker.theme_names ??
      ticker.theme_slugs
        .map((slug) => themeNameBySlug.get(slug))
        .filter((name): name is string => Boolean(name)),
    aliases: ticker.aliases ?? [],
  }));
  const groups = index.groups.map((group) => ({
    ...group,
    aliases: group.aliases ?? [],
  }));
  return { ...index, tickers, themes, groups };
}
