/** Subtheme label after group prefix, e.g. "Home Improvement '24: Retail" → "Retail". */
export function rotationThemeLabelSuffix(
  themeName: string,
  groupName?: string | null,
): string {
  const name = String(themeName ?? "").trim();
  if (!name) return "";

  const colonIdx = name.indexOf(":");
  if (colonIdx >= 0) {
    const suffix = name.slice(colonIdx + 1).trim();
    if (suffix) return suffix;
  }

  const group = String(groupName ?? "").trim();
  if (group) {
    const lowerName = name.toLowerCase();
    const lowerGroup = group.toLowerCase();
    if (lowerName.startsWith(lowerGroup)) {
      const rest = name.slice(group.length).replace(/^[\s\-–—:|]+/, "").trim();
      if (rest) return rest;
    }
  }

  return name;
}
