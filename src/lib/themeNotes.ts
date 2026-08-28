import type { ThemeNotesV0 } from "@/types/theme.notes.v0";

export const NOTES_SIDECAR_SUFFIX = ".notes.v0.json";

export function themeNotesUrl(dataBaseUrl: string, slug: string): string {
  return `${dataBaseUrl.replace(/\/$/, "")}/themes/${encodeURIComponent(slug)}${NOTES_SIDECAR_SUFFIX}`;
}

export function parseThemeNotes(raw: string | ThemeNotesV0): ThemeNotesV0 {
  const data = (typeof raw === "string" ? JSON.parse(raw) : raw) as ThemeNotesV0;
  if (data?.schema_version !== "theme.notes.v0") {
    throw new Error("Invalid theme.notes.v0 payload");
  }
  if (!data.slug || !data.name || !Array.isArray(data.constituents)) {
    throw new Error("Invalid theme.notes.v0 payload");
  }
  return data;
}

/** Map ticker → note for merge into the constituents table. */
export function notesByTicker(data: ThemeNotesV0 | null | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!data?.constituents) return out;
  for (const row of data.constituents) {
    const ticker = String(row?.ticker || "")
      .trim()
      .toUpperCase();
    const note = String(row?.ticker_note || "").trim();
    if (!ticker || !note || note.toLowerCase() === "nan") continue;
    out.set(ticker, note);
  }
  return out;
}

export function notesSidecarHasContent(data: ThemeNotesV0 | null | undefined): boolean {
  return notesByTicker(data).size > 0;
}
