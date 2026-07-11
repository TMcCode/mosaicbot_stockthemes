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

/**
 * Split "Euro Spend '26: European Shipbuilding" → title + group prefix for stacked UI.
 * Themes without a colon keep the full name on the title line.
 */
export function splitThemeDisplayName(themeName: string): {
  title: string;
  groupPrefix: string | null;
} {
  const name = String(themeName ?? "").trim();
  if (!name) return { title: "", groupPrefix: null };

  const colonIdx = name.indexOf(":");
  if (colonIdx < 0) return { title: name, groupPrefix: null };

  const groupPrefix = name.slice(0, colonIdx).trim();
  const title = name.slice(colonIdx + 1).trim();
  if (!title) return { title: name, groupPrefix: null };
  if (!groupPrefix) return { title, groupPrefix: null };
  return { title, groupPrefix };
}
