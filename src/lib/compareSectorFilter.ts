/** Sentinel for groups with blank / missing ``spy_sector``. */
export const COMPARE_SECTOR_UNMAPPED = "Unmapped";

/** Preferred sector option order (matches /groups; Unmapped last). */
export const COMPARE_SECTOR_ORDER: readonly string[] = [
  "Communication Services",
  "Consumer Discretionary",
  "Consumer Staples",
  "Energy",
  "Financials",
  "Health Care",
  "Industrials",
  "Information Technology",
  "Materials",
  "Real Estate",
  "Utilities",
  "Macro",
  "Other",
  COMPARE_SECTOR_UNMAPPED,
];

export function normalizeCompareSpySector(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  return s || COMPARE_SECTOR_UNMAPPED;
}

export function orderCompareSectorOptions(sectors: Iterable<string>): string[] {
  const set = new Set(
    [...sectors].map((s) => normalizeCompareSpySector(s)).filter(Boolean),
  );
  const ordered = COMPARE_SECTOR_ORDER.filter((s) => set.has(s));
  const rest = [...set]
    .filter((s) => !COMPARE_SECTOR_ORDER.includes(s))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return [...ordered, ...rest];
}

/** True when sector multi-select should not restrict themes / group list. */
export function isCompareSectorFilterInactive(
  selectedSectors: string[],
  sectorOptions: string[],
): boolean {
  if (sectorOptions.length === 0) return true;
  if (selectedSectors.length === 0) return true;
  if (selectedSectors.length >= sectorOptions.length) return true;
  return false;
}
