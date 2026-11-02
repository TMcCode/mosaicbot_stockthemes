/** Quote-like chars used before a 2-digit year suffix. */
const YEAR_QUOTE = `['\u2019\u2018\u2032\u00B4\`]`;

const TRAILING_YEAR_RE = new RegExp(`\\s*${YEAR_QUOTE}?\\d{2}\\s*$`, "u");
/** Inline vintage tokens in prose / SEO strings (`` '26`` / ``'26``). */
const INLINE_YEAR_RE = new RegExp(`\\s*${YEAR_QUOTE}\\d{2}\\b`, "gu");

/** Drop trailing `` '26`` / ``'26`` / ``’26`` from a group prefix or bare label. */
export function stripThemeYearSuffix(label: string): string {
  return String(label || "").replace(TRAILING_YEAR_RE, "").trim();
}

/**
 * Public UI label: ``Group '26: Subtheme`` → ``Group: Subtheme``.
 * Pure string transform — call at render; do not precompute catalogs.
 * Keep canonical ``theme.name`` for slugs, joins, and short-theme math.
 */
export function themeDisplayLabel(themeName: string): string {
  const name = String(themeName ?? "").trim();
  if (!name) return "";

  const colonIdx = name.indexOf(":");
  if (colonIdx < 0) return stripThemeYearSuffix(name) || name;

  const groupPrefix = name.slice(0, colonIdx).trim();
  const title = name.slice(colonIdx + 1).trim();
  if (!title) return stripThemeYearSuffix(name) || name;

  const group = stripThemeYearSuffix(groupPrefix) || groupPrefix;
  if (!group) return title;
  return `${group}: ${title}`;
}

/** Strip `` 'YY`` tokens from SEO / OG prose that already embeds the full theme name. */
export function stripThemeYearInProse(text: string): string {
  return String(text || "").replace(INLINE_YEAR_RE, "").replace(/  +/g, " ").trim();
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
 * Split "Euro Spend '26: European Shipbuilding" → title + year-free group prefix.
 * Themes without a colon keep the full name on the title line (year stripped).
 */
export function splitThemeDisplayName(themeName: string): {
  title: string;
  groupPrefix: string | null;
} {
  const name = String(themeName ?? "").trim();
  if (!name) return { title: "", groupPrefix: null };

  const colonIdx = name.indexOf(":");
  if (colonIdx < 0) {
    return { title: stripThemeYearSuffix(name) || name, groupPrefix: null };
  }

  const rawGroup = name.slice(0, colonIdx).trim();
  const title = name.slice(colonIdx + 1).trim();
  if (!title) return { title: stripThemeYearSuffix(name) || name, groupPrefix: null };
  if (!rawGroup) return { title, groupPrefix: null };
  const groupPrefix = stripThemeYearSuffix(rawGroup) || rawGroup;
  return { title, groupPrefix };
}

/**
 * Group eyebrow from ``Group '25: Subtheme`` when manifest meta is missing.
 * ``Software '26`` → ``Software``.
 */
export function groupEyebrowFromThemeName(themeName: string): string | null {
  const { groupPrefix } = splitThemeDisplayName(themeName);
  if (!groupPrefix) return null;
  return groupPrefix;
}
