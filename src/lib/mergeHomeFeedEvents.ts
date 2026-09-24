import { consolidateTextTableFeedEvents } from "@/lib/consolidateTextTableFeedEvents";
import { enrichThesisFeedThemes } from "@/lib/enrichThesisFeedThemes";
import type { ManifestHomeFeedEventV0, ManifestV0 } from "@/types/manifest.v0";

function normThemeName(s: string | undefined): string {
  return String(s || "").trim();
}

function lifecycleFeedKey(evt: ManifestHomeFeedEventV0): string {
  return `${evt.kind}:${normThemeName(evt.theme_name)}`;
}

/**
 * Membership chips need ``membership_preview`` and/or parseable
 * ``"AAPL added"`` / ``"XYZ removed"`` phrases. Metadata-only updates
 * (and catalog ``updated_at`` fallbacks) have neither — UI would show an
 * empty "Membership Updated" card.
 */
export function themeUpdatedHasMembershipChips(e: ManifestHomeFeedEventV0): boolean {
  if (Array.isArray(e.membership_preview) && e.membership_preview.length > 0) {
    return true;
  }
  const phrases = Array.isArray(e.changes_preview) ? e.changes_preview : [];
  return phrases.some((x) => /\b(added|removed)\b/i.test(String(x || "")));
}

/** Exclude noisy LLM batch Group Overview lines from the public feed (matches ETL filter). */
function isGroupOverviewTextTableNoise(e: ManifestHomeFeedEventV0): boolean {
  if (e.kind !== "text_table_update") return false;
  const blob = `${e.title || ""} ${e.summary || ""}`.toLowerCase();
  return blob.includes("group overview");
}

/** Thesis feed rows: BullBearDetails, or legacy consolidated theme ``text tables updated``. */
function isThesisTextTableEvent(e: ManifestHomeFeedEventV0): boolean {
  if (e.kind !== "text_table_update") return false;
  const title = String(e.title || "").trim();
  const summary = String(e.summary || "").trim();
  const blob = `${title} ${summary}`.toLowerCase().replace(/_/g, " ");
  if (blob.includes("thesis updated")) return true;
  if (blob.replace(/\s+/g, "").includes("bullbeardetails") || blob.includes("bull bear details")) {
    return true;
  }
  // After ETL consolidate, table name is stripped → ``Theme — text tables updated``.
  // Theme display names almost always include a year marker ('24) and/or a colon subtheme.
  if (/—\s*text tables updated$/i.test(title)) {
    const theme = String(e.theme_name || title.split("—")[0] || "").trim();
    if (/['’']\d{2}\b/.test(theme) || theme.includes(":")) return true;
  }
  return false;
}

/** Thesis cards show current prose — keep one row per theme (newest event_at). */
function keepLatestThesisPerTheme(events: ManifestHomeFeedEventV0[]): ManifestHomeFeedEventV0[] {
  const sorted = [...events].sort((a, b) =>
    String(b.event_at).localeCompare(String(a.event_at)),
  );
  const out: ManifestHomeFeedEventV0[] = [];
  const seen = new Set<string>();
  for (const e of sorted) {
    if (e.kind !== "text_table_update") {
      out.push(e);
      continue;
    }
    const slug = String(e.theme_slug || "").trim().toLowerCase();
    const name = normThemeName(e.theme_name).toLowerCase();
    const key = slug || name;
    if (!key) {
      out.push(e);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/**
 * Lifecycle (theme_new / theme_updated) from manifest lists, enriched by ETL.
 * Non-lifecycle rows from ETL are thesis text-table updates (Group Overview out;
 * hollow theme_weights_updated excluded).
 */
export type MergeHomeFeedEventsOptions = {
  /** Ticker → theme display names (from search index); used to group thesis rows by theme. */
  tickerToThemeNames?: Map<string, string[]>;
};

export function mergeHomeFeedEvents(
  manifest: ManifestV0,
  themeByName: Map<string, { slug?: string; name: string }>,
  etl: ManifestHomeFeedEventV0[],
  options?: MergeHomeFeedEventsOptions,
): ManifestHomeFeedEventV0[] {
  const newNames = Array.isArray(manifest.new_themes) ? manifest.new_themes : [];
  const updatedRaw = Array.isArray(manifest.updated_themes) ? manifest.updated_themes : [];
  const newSet = new Set(newNames.map((n) => normThemeName(String(n))));
  const updatedNames = updatedRaw.filter((n) => !newSet.has(normThemeName(String(n))));

  const base: ManifestHomeFeedEventV0[] = [
    ...newNames.map((name) => {
      const n = String(name).trim();
      return {
        kind: "theme_new" as const,
        event_at:
          manifest.new_theme_events?.find((e) => e.name === n)?.first_seen_at ||
          new Date().toISOString(),
        title: `${n} - new theme`,
        summary: "",
        theme_name: n,
        theme_slug: themeByName.get(n)?.slug || "",
      };
    }),
    ...updatedNames.map((name) => {
      const n = String(name).trim();
      const ev = manifest.updated_theme_events?.find((e) => e.name === n);
      return {
        kind: "theme_updated" as const,
        event_at: ev?.last_content_change_at || ev?.first_seen_at || new Date().toISOString(),
        title: `${n} - theme updated`,
        summary: "",
        theme_name: n,
        theme_slug: themeByName.get(n)?.slug || "",
      };
    }),
  ];

  const enrichByKey = new Map<string, ManifestHomeFeedEventV0>();
  for (const e of etl) {
    if (e.kind === "theme_new" || e.kind === "theme_updated") {
      enrichByKey.set(lifecycleFeedKey(e), e);
    }
  }

  const mergedLifecycle = base.map((b) => {
    const en = enrichByKey.get(lifecycleFeedKey(b));
    if (!en) return b;
    return {
      ...b,
      ...en,
      event_at: b.event_at,
      theme_name: b.theme_name || en.theme_name,
      theme_slug: b.theme_slug || en.theme_slug,
      note: en.note ?? b.note,
      changes_preview: en.changes_preview ?? b.changes_preview,
      changes_more_count: en.changes_more_count ?? b.changes_more_count,
      holdings_preview: en.holdings_preview ?? b.holdings_preview,
      holdings_more_count: en.holdings_more_count ?? b.holdings_more_count,
      membership_preview: en.membership_preview ?? b.membership_preview,
      membership_more_count: en.membership_more_count ?? b.membership_more_count,
    };
  });

  const baseKeys = new Set(mergedLifecycle.map(lifecycleFeedKey));
  const orphanLifecycle: ManifestHomeFeedEventV0[] = [];
  for (const e of etl) {
    if (e.kind !== "theme_new" && e.kind !== "theme_updated") continue;
    if (!baseKeys.has(lifecycleFeedKey(e))) orphanLifecycle.push(e);
  }

  const deleted = etl.filter((e) => e.kind === "theme_deleted");

  const nonLifecycleRaw = etl.filter((e) => {
    // Weight-only rows have no add/remove chips — hide from public feed.
    if (e.kind === "theme_weights_updated") return false;
    return (
      e.kind === "text_table_update" &&
      !isGroupOverviewTextTableNoise(e) &&
      isThesisTextTableEvent(e)
    );
  });
  const themeSlugByName = new Map<string, string>();
  for (const [name, t] of themeByName) {
    const slug = String(t.slug || "").trim();
    if (name && slug) themeSlugByName.set(name, slug);
  }
  const nonLifecycle = keepLatestThesisPerTheme(
    enrichThesisFeedThemes(
      consolidateTextTableFeedEvents(nonLifecycleRaw, themeSlugByName, options?.tickerToThemeNames),
      themeSlugByName,
      options?.tickerToThemeNames,
    ),
  );

  const combined = [...mergedLifecycle, ...orphanLifecycle, ...deleted, ...nonLifecycle];

  // Do not synthesize hollow ``theme_weights_updated`` from catalog timestamps —
  // those cards have no changed-weight chips and clutter the feed.

  const filtered = combined.filter(
    (e) => e.kind !== "theme_updated" || themeUpdatedHasMembershipChips(e),
  );
  filtered.sort((a, b) => String(b.event_at).localeCompare(String(a.event_at)));
  return filtered;
}

export function isWithinFeedWindow(iso: string | undefined, maxDays: number): boolean {
  if (!iso) return false;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return false;
  const ageMs = Date.now() - ts;
  return ageMs >= 0 && ageMs <= maxDays * 24 * 60 * 60 * 1000;
}

/**
 * Homepage candidates: date-desc within ``maxDays``, capped at ``maxItems``
 * (before flipper collapse + home render slice). Pure recency so thesis and
 * membership both surface when fresh — do not bury thesis under lifecycle.
 */
export function prioritizeLifecycleHomeFeed(
  events: ManifestHomeFeedEventV0[],
  maxItems: number,
  maxDays: number,
): ManifestHomeFeedEventV0[] {
  const inWindow = events.filter((e) => isWithinFeedWindow(e.event_at, maxDays));
  const sortDesc = (a: ManifestHomeFeedEventV0, b: ManifestHomeFeedEventV0) =>
    String(b.event_at).localeCompare(String(a.event_at));
  inWindow.sort(sortDesc);
  return inWindow.slice(0, maxItems);
}

export function countFeedEventsInWindow(
  events: ManifestHomeFeedEventV0[],
  maxDays: number,
): number {
  return events.filter((e) => isWithinFeedWindow(e.event_at, maxDays)).length;
}

/** Full feed page: pure date-desc order, no day cap. */
export function prioritizeLifecycleFeedFull(events: ManifestHomeFeedEventV0[]): ManifestHomeFeedEventV0[] {
  const ordered = [...events];
  const sortDesc = (a: ManifestHomeFeedEventV0, b: ManifestHomeFeedEventV0) =>
    String(b.event_at).localeCompare(String(a.event_at));
  ordered.sort(sortDesc);
  return ordered;
}
