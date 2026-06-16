import type { HomeCommentaryItemV0 } from "@/types/home_commentary.v0";

export const HOME_COMMENTARY_PREVIEW_COUNT = 3;

/** Max visible lines on homepage commentary cards before clamp + “Read more”. */
export const HOME_COMMENTARY_PREVIEW_CLAMP_LINES = 3;

/** Rough chars per line at homepage preview font size (used for wrap heuristic). */
const HOME_PREVIEW_CHARS_PER_LINE = 48;

export function normalizeCommentaryEntryType(
  value: string | undefined,
): "regular" | "nightly" {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (
    v === "nightly" ||
    v === "nightly commentary" ||
    v === "nightly_commentary" ||
    v === "nightly update" ||
    v === "nightly_update"
  ) {
    return "nightly";
  }
  return "regular";
}

export function fmtCommentaryDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function commentaryItemsForPreview(
  items: HomeCommentaryItemV0[],
  previewDays: number,
  limit = HOME_COMMENTARY_PREVIEW_COUNT,
): HomeCommentaryItemV0[] {
  const cutoff = Date.now() - previewDays * 24 * 60 * 60 * 1000;
  return items
    .filter((item) => {
      const t = new Date(item.date).getTime();
      return Number.isFinite(t) && t >= cutoff;
    })
    .slice(0, limit);
}

export function truncateCommentaryNote(note: string, maxLen = 420): string {
  const t = note.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

/** Stable hash target for /commentary#… deep links. */
export function commentaryItemAnchorId(date: string): string {
  const raw = String(date || "").trim();
  if (!raw) return "commentary-item";
  return `commentary-${raw.replace(/[:.]/g, "-")}`;
}

export function commentaryPreviewHref(date: string): string {
  return `/commentary#${commentaryItemAnchorId(date)}`;
}

/** True when note likely exceeds the homepage line clamp (newlines or length). */
export function commentaryPreviewNeedsMore(
  note: string,
  maxLines = HOME_COMMENTARY_PREVIEW_CLAMP_LINES,
): boolean {
  const t = note.trim();
  if (!t) return false;
  if (t.split(/\n/).filter((line) => line.trim()).length > maxLines) return true;
  return t.length > maxLines * HOME_PREVIEW_CHARS_PER_LINE;
}
