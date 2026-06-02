import { buildThesisThemes } from "@/lib/enrichThesisFeedThemes";
import type { ManifestHomeFeedEventV0 } from "@/types/manifest.v0";

const TEXT_TABLE_TITLE_RE = /^(.+?)\s+—\s+(?:(\d+)\s+text tables|.+?)\s+updated$/i;

function parseTextTableEntity(evt: ManifestHomeFeedEventV0): { kind: "ticker" | "theme"; id: string } | null {
  const title = String(evt.title || "").trim();
  const m = title.match(TEXT_TABLE_TITLE_RE);
  const entity = String(m?.[1] || "").trim();
  const themeName = String(evt.theme_name || "").trim();
  if (!entity && !themeName) return null;

  const tickerFromTitle = entity && !themeName ? entity.toUpperCase() : "";
  if (themeName && entity && themeName.toLowerCase() === entity.toLowerCase()) {
    return { kind: "theme", id: themeName };
  }
  if (themeName && !entity) {
    return { kind: "theme", id: themeName };
  }
  if (tickerFromTitle) {
    return { kind: "ticker", id: tickerFromTitle };
  }
  if (entity) {
    return { kind: "ticker", id: entity.toUpperCase() };
  }
  return null;
}

function eventDay(iso: string | undefined): string {
  return String(iso || "").trim().slice(0, 10);
}

/**
 * Collapse per-table rows (e.g. five PL tables on one day) into one thesis-update row.
 * When `tickerToThemeNames` is set, summary highlights affected themes.
 */
export function consolidateTextTableFeedEvents(
  events: ManifestHomeFeedEventV0[],
  themeSlugByName: Map<string, string>,
  tickerToThemeNames?: Map<string, string[]>,
): ManifestHomeFeedEventV0[] {
  const passthrough: ManifestHomeFeedEventV0[] = [];
  const buckets = new Map<string, ManifestHomeFeedEventV0[]>();

  for (const evt of events) {
    if (evt.kind !== "text_table_update") {
      passthrough.push(evt);
      continue;
    }
    const parsed = parseTextTableEntity(evt);
    const day = eventDay(evt.event_at);
    if (!parsed || !day) {
      passthrough.push(evt);
      continue;
    }
    const key = `${parsed.kind}:${parsed.id}:${day}`;
    const list = buckets.get(key) ?? [];
    list.push(evt);
    buckets.set(key, list);
  }

  const consolidated: ManifestHomeFeedEventV0[] = [];
  for (const [, group] of buckets) {
    group.sort((a, b) => String(b.event_at).localeCompare(String(a.event_at)));
    const latest = group[0];
    const parsed = parseTextTableEntity(latest);
    if (!parsed) {
      passthrough.push(...group);
      continue;
    }

    let themeNames: string[] = [];
    if (parsed.kind === "ticker") {
      themeNames = [...(tickerToThemeNames?.get(parsed.id) ?? [])];
      for (const g of group) {
        const nm = String(g.theme_name || "").trim();
        if (nm && !themeNames.some((x) => x.toLowerCase() === nm.toLowerCase())) {
          themeNames.push(nm);
        }
      }
      themeNames.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    } else {
      themeNames = [parsed.id];
    }

    const primaryTheme = themeNames[0] || String(latest.theme_name || "").trim();
    const { themes: thesisThemes, moreCount: thesisThemesMore } =
      parsed.kind === "ticker" && themeNames.length
        ? buildThesisThemes(themeNames, themeSlugByName)
        : parsed.kind === "theme"
          ? buildThesisThemes(themeNames, themeSlugByName)
          : { themes: [], moreCount: 0 };
    const title = `${parsed.id} — text tables updated`;

    consolidated.push({
      kind: "text_table_update",
      event_at: latest.event_at,
      title,
      summary: "",
      theme_name: primaryTheme || undefined,
      theme_slug: primaryTheme ? themeSlugByName.get(primaryTheme) || latest.theme_slug : latest.theme_slug,
      thesis_themes: thesisThemes.length ? thesisThemes : undefined,
      thesis_themes_more_count: thesisThemesMore > 0 ? thesisThemesMore : undefined,
    });
  }

  consolidated.sort((a, b) => String(b.event_at).localeCompare(String(a.event_at)));
  return [...passthrough, ...consolidated];
}
