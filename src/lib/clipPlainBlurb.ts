/** Clamp overview / desk blurbs for hero slots (1–2 short sentences). */
export function clipPlainBlurb(raw: string, maxChars = 160): string {
  const text = String(raw || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (text.length <= maxChars) return text;

  const slice = text.slice(0, maxChars);
  const sentenceEnd = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (sentenceEnd >= 48) {
    return slice.slice(0, sentenceEnd + 1).trim();
  }
  const space = slice.lastIndexOf(" ");
  const cut = space > 40 ? slice.slice(0, space) : slice;
  return `${cut.replace(/[.,;:]+$/, "").trim()}…`;
}
