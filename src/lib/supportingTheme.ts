/** Cross-group mirror themes marked supporting in Theme_Metadata / compare_themes. */

export function isSupportingThemeRankVisibility(
  rankVisibility: string | null | undefined,
): boolean {
  return String(rankVisibility || "")
    .trim()
    .toLowerCase() === "supporting";
}
