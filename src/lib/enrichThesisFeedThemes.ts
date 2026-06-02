import type { ManifestHomeFeedEventV0, ManifestHomeFeedThesisThemeV0 } from "@/types/manifest.v0";

const TEXT_TABLE_TITLE_RE = /^(.+?)\s+—\s+(?:(\d+)\s+text tables|.+?)\s+updated$/i;

const MAX_SHOWN = 6;

function slugForThemeName(name: string, themeSlugByName: Map<string, string>): string {
  const direct = themeSlugByName.get(name);
  if (direct) return direct;
  const lower = name.toLowerCase();
  for (const [key, slug] of themeSlugByName) {
    if (key.toLowerCase() === lower) return slug;
  }
  return "";
}

function parseTickerFromTitle(title: string): string {
  const m = String(title || "")
    .trim()
    .match(TEXT_TABLE_TITLE_RE);
  const entity = String(m?.[1] || "").trim();
  return entity ? entity.toUpperCase() : "";
}

function buildThesisThemes(
  themeNames: string[],
  themeSlugByName: Map<string, string>,
): { themes: ManifestHomeFeedThesisThemeV0[]; moreCount: number } {
  const unique: string[] = [];
  for (const raw of themeNames) {
    const name = String(raw || "").trim();
    if (!name) continue;
    if (unique.some((x) => x.toLowerCase() === name.toLowerCase())) continue;
    unique.push(name);
  }
  unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const shown = unique.slice(0, MAX_SHOWN);
  const themes = shown.map((name) => ({
    name,
    slug: slugForThemeName(name, themeSlugByName),
  }));
  return { themes, moreCount: Math.max(0, unique.length - shown.length) };
}

/** Attach linkable theme rows to consolidated thesis feed events (no extra fetch). */
export function enrichThesisFeedThemes(
  events: ManifestHomeFeedEventV0[],
  themeSlugByName: Map<string, string>,
  tickerToThemeNames?: Map<string, string[]>,
): ManifestHomeFeedEventV0[] {
  return events.map((evt) => {
    if (evt.kind !== "text_table_update") return evt;
    if (evt.thesis_themes?.length) return evt;

    const ticker = parseTickerFromTitle(evt.title);
    if (!ticker || !tickerToThemeNames) return evt;

    const names = tickerToThemeNames.get(ticker) ?? [];
    if (!names.length) return evt;

    const { themes, moreCount } = buildThesisThemes(names, themeSlugByName);
    if (!themes.length) return evt;

    return {
      ...evt,
      thesis_themes: themes,
      thesis_themes_more_count: moreCount,
    };
  });
}

export { buildThesisThemes, MAX_SHOWN as THESIS_FEED_THEMES_MAX_SHOWN };
