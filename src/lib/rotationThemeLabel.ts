/** Quote-like chars used before a 2-digit year suffix. */
const YEAR_QUOTE = `['\u2019\u2018\u2032\u00B4\`]`;

/** Drop trailing `` '26`` / ``'26`` / ``’26`` so the year can live in a chip. */
export function stripThemeYearSuffix(label: string): string {
  return String(label || "")
    .replace(new RegExp(`\\s*${YEAR_QUOTE}?\\d{2}\\s*$`, "u"), "")
    .trim();
}

/** ``'24`` / ``’24`` from a theme or group name. */
export function themeYearChipFromName(name: string): string | null {
  const m = new RegExp(`${YEAR_QUOTE}(\\d{2})\\b`, "u").exec(String(name || ""));
  return m ? `'${m[1]}` : null;
}

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
    if (suffix) return stripThemeYearSuffix(suffix) || suffix;
  }

  const group = String(groupName ?? "").trim();
  if (group) {
    const lowerName = name.toLowerCase();
    const lowerGroup = group.toLowerCase();
    if (lowerName.startsWith(lowerGroup)) {
      const rest = name.slice(group.length).replace(/^[\s\-–—:|]+/, "").trim();
      if (rest) return stripThemeYearSuffix(rest) || rest;
    }
    // Catalog group often includes year (`Chemicals '26`); theme may match without it.
    const groupBare = stripThemeYearSuffix(group);
    if (groupBare && groupBare.toLowerCase() !== lowerGroup) {
      const lowerBare = groupBare.toLowerCase();
      if (lowerName.startsWith(lowerBare)) {
        const rest = name.slice(groupBare.length).replace(/^[\s\-–—:|]+/, "").trim();
        if (rest) return stripThemeYearSuffix(rest) || rest;
      }
    }
  }

  return stripThemeYearSuffix(name) || name;
}

/**
 * Split "Euro Spend '26: European Shipbuilding" → title + group prefix for stacked UI.
 * Themes without a colon keep the full name on the title line.
 * Keeps year tokens in the strings (callers that want chips strip separately).
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

/**
 * Group eyebrow from ``Group '25: Subtheme`` when manifest meta is missing.
 * ``Software '26`` → ``Software`` (year stays on the chip).
 */
export function groupEyebrowFromThemeName(themeName: string): string | null {
  const { groupPrefix } = splitThemeDisplayName(themeName);
  if (!groupPrefix) return null;
  const stripped = stripThemeYearSuffix(groupPrefix);
  return stripped || groupPrefix;
}
