import type { ManifestHomeFeedEventV0, ManifestV0 } from "@/types/manifest.v0";

function normThemeName(s: string | undefined): string {
  return String(s || "").trim();
}

function lifecycleFeedKey(evt: ManifestHomeFeedEventV0): string {
  return `${evt.kind}:${normThemeName(evt.theme_name)}`;
}

/** Exclude noisy LLM batch Group Overview lines from the public feed (matches ETL filter). */
function isGroupOverviewTextTableNoise(e: ManifestHomeFeedEventV0): boolean {
  if (e.kind !== "text_table_update") return false;
  const blob = `${e.title || ""} ${e.summary || ""}`.toLowerCase();
  return blob.includes("group overview");
}

/**
 * Lifecycle (theme_new / theme_updated) from manifest lists, enriched by ETL. Non-lifecycle
 * rows from ETL are text-table updates only (no renames / theme_change; Group Overview out).
 */
export function mergeHomeFeedEvents(
  manifest: ManifestV0,
  themeByName: Map<string, { slug?: string; name: string }>,
  etl: ManifestHomeFeedEventV0[],
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
    };
  });

  const baseKeys = new Set(mergedLifecycle.map(lifecycleFeedKey));
  const orphanLifecycle: ManifestHomeFeedEventV0[] = [];
  for (const e of etl) {
    if (e.kind !== "theme_new" && e.kind !== "theme_updated") continue;
    if (!baseKeys.has(lifecycleFeedKey(e))) orphanLifecycle.push(e);
  }

  const nonLifecycle = etl.filter(
    (e) =>
      e.kind === "text_table_update" &&
      !isGroupOverviewTextTableNoise(e),
  );

  const combined = [...mergedLifecycle, ...orphanLifecycle, ...nonLifecycle];
  combined.sort((a, b) => String(b.event_at).localeCompare(String(a.event_at)));
  return combined;
}

export function isWithinFeedWindow(iso: string | undefined, maxDays: number): boolean {
  if (!iso) return false;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return false;
  const ageMs = Date.now() - ts;
  return ageMs >= 0 && ageMs <= maxDays * 24 * 60 * 60 * 1000;
}

function isLifecycleFeedKind(e: ManifestHomeFeedEventV0): boolean {
  return e.kind === "theme_new" || e.kind === "theme_updated";
}

/**
 * Homepage: show **new / updated theme** rows first (newest first), then other activity.
 * Otherwise pure date order buries them under many same-day text-table or audit rows.
 */
export function prioritizeLifecycleHomeFeed(
  events: ManifestHomeFeedEventV0[],
  maxItems: number,
  maxDays: number,
): ManifestHomeFeedEventV0[] {
  const inWin = (e: ManifestHomeFeedEventV0) => isWithinFeedWindow(e.event_at, maxDays);
  const lifecycle = events.filter(isLifecycleFeedKind).filter(inWin);
  const rest = events.filter((e) => !isLifecycleFeedKind(e)).filter(inWin);
  const sortDesc = (a: ManifestHomeFeedEventV0, b: ManifestHomeFeedEventV0) =>
    String(b.event_at).localeCompare(String(a.event_at));
  lifecycle.sort(sortDesc);
  rest.sort(sortDesc);
  return [...lifecycle, ...rest].slice(0, maxItems);
}

export function countFeedEventsInWindow(
  events: ManifestHomeFeedEventV0[],
  maxDays: number,
): number {
  return events.filter((e) => isWithinFeedWindow(e.event_at, maxDays)).length;
}

/** Full feed page: lifecycle rows first (newest first), then other activity (newest first). No day cap. */
export function prioritizeLifecycleFeedFull(events: ManifestHomeFeedEventV0[]): ManifestHomeFeedEventV0[] {
  const lifecycle = events.filter(isLifecycleFeedKind);
  const rest = events.filter((e) => !isLifecycleFeedKind(e));
  const sortDesc = (a: ManifestHomeFeedEventV0, b: ManifestHomeFeedEventV0) =>
    String(b.event_at).localeCompare(String(a.event_at));
  lifecycle.sort(sortDesc);
  rest.sort(sortDesc);
  return [...lifecycle, ...rest];
}
