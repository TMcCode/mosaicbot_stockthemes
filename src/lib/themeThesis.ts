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

/** Non-placeholder thesis prose, or empty string. */
export function themeThesisProse(tt: ThemeThesisV0 | undefined): string {
  return themeThesisHasContent(tt) ? normalizedThesis(tt) : "";
}

/**
 * First sentence of thesis for the public hero blurb.
 * Splits on `. ` / `?` / `!` followed by a capital or end of string; keeps the trailing mark.
 */
export function themeThesisFirstSentence(tt: ThemeThesisV0 | undefined): string {
  const prose = themeThesisProse(tt);
  if (!prose) return "";
  const match = prose.match(/^[\s\S]+?(?:[.!?](?=\s+[A-Z(“"']|\s*$)|$)/);
  const sentence = (match?.[0] ?? prose).trim();
  return sentence;
}

/** Use before rendering ThemeThesisBlock (avoids empty or bull/bear-only payloads). */
export function shouldShowThemeThesisUi(tt: ThemeThesisV0 | undefined): boolean {
  return themeThesisHasContent(tt);
}
