import { isCompareSectorFilterInactive } from "@/lib/compareSectorFilter";

export type CompareFilterRow = {
  name: string;
  groupName?: string | null;
  spySector?: string | null;
};

export function deriveCompareYearTag(name: string): string | null {
  const m = String(name || "").match(/'(\d{2})\b/);
  return m ? m[1] : null;
}

export function filterCompareRows<T extends CompareFilterRow>(
  rows: T[],
  options: {
    groupOptions: string[];
    yearOptions: string[];
    sectorOptions?: string[];
    selectedGroups: string[];
    selectedYears: string[];
    selectedSectors?: string[];
  },
): T[] {
  const {
    groupOptions,
    yearOptions,
    sectorOptions = [],
    selectedGroups,
    selectedYears,
    selectedSectors = [],
  } = options;

  const sectorInactive = isCompareSectorFilterInactive(selectedSectors, sectorOptions);
  const filterSectors = !sectorInactive;
  const filterGroups =
    groupOptions.length > 0 &&
    selectedGroups.length > 0 &&
    selectedGroups.length < groupOptions.length;
  const filterYears =
    yearOptions.length > 0 &&
    selectedYears.length > 0 &&
    selectedYears.length < yearOptions.length;

  return rows.filter((r) => {
    if (sectorOptions.length > 0 && selectedSectors.length === 0) {
      return false;
    }
    if (filterSectors) {
      const sector = String(r.spySector || "").trim();
      if (!selectedSectors.includes(sector)) return false;
    }
    if (filterGroups) {
      const g = String(r.groupName || "");
      if (!selectedGroups.includes(g)) return false;
    } else if (groupOptions.length > 0 && selectedGroups.length === 0) {
      return false;
    }
    if (filterYears) {
      const y = deriveCompareYearTag(r.name);
      if (!y || !selectedYears.includes(y)) return false;
    } else if (yearOptions.length > 0 && selectedYears.length === 0) {
      return false;
    }
    return true;
  });
}
