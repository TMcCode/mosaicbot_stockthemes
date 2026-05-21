import type { HomeCommentaryItemV0 } from "@/types/home_commentary.v0";

export const HOME_COMMENTARY_PREVIEW_COUNT = 3;

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
