import type { ThemeThesisV0 } from "@/types/theme.detail.v0";

const PLACEHOLDER_THESIS = new Set([
  "",
  "—",
  "-",
  "n/a",
  "na",
  "tbd",
  "coming soon",
  "none",
]);

function normalizedThesis(tt: ThemeThesisV0 | undefined): string {
  return String(tt?.thesis ?? "").trim();
}

/** True only when there is a real headline thesis paragraph to show or gate. */
export function themeThesisHasContent(tt: ThemeThesisV0 | undefined): boolean {
  const thesis = normalizedThesis(tt);
  if (!thesis) {
    return false;
  }
  return !PLACEHOLDER_THESIS.has(thesis.toLowerCase());
}

/** Use before rendering ThemeThesisBlock (avoids empty or bull/bear-only payloads). */
export function shouldShowThemeThesisUi(tt: ThemeThesisV0 | undefined): boolean {
  return themeThesisHasContent(tt);
}
