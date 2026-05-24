export type CompareFilterRow = {
  name: string;
  groupName?: string | null;
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
    selectedGroups: string[];
    selectedYears: string[];
  },
): T[] {
  const { groupOptions, yearOptions, selectedGroups, selectedYears } = options;
  const filterGroups =
    groupOptions.length > 0 &&
    selectedGroups.length > 0 &&
    selectedGroups.length < groupOptions.length;
  const filterYears =
    yearOptions.length > 0 &&
    selectedYears.length > 0 &&
    selectedYears.length < yearOptions.length;

  return rows.filter((r) => {
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
