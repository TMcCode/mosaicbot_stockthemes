export type ConstituentSortState = { key: string; dir: "asc" | "desc" };

export const DEFAULT_CONSTITUENT_SORT: ConstituentSortState[] = [
  { key: "weight", dir: "desc" },
];

export function toggleConstituentSort(
  prev: ConstituentSortState[],
  key: string,
  shiftKey: boolean,
): ConstituentSortState[] {
  const idx = prev.findIndex((s) => s.key === key);
  const nextDir = idx >= 0 && prev[idx].dir === "desc" ? "asc" : "desc";
  if (!shiftKey) return [{ key, dir: nextDir }];
  if (idx >= 0) {
    const copy = [...prev];
    copy[idx] = { key, dir: nextDir };
    return copy;
  }
  return [...prev, { key, dir: nextDir }];
}

/** Compare nullable numbers; nulls sort last. Returns 0 when both missing/equal. */
export function compareNullableNumbers(
  va: number | null | undefined,
  vb: number | null | undefined,
  dir: "asc" | "desc",
): number {
  const aOk = va != null && Number.isFinite(va);
  const bOk = vb != null && Number.isFinite(vb);
  if (aOk && bOk && va !== vb) return dir === "asc" ? va - vb : vb - va;
  if (aOk !== bOk) return aOk ? -1 : 1;
  return 0;
}

export function compareText(a: string, b: string, dir: "asc" | "desc"): number {
  const cmp = a.localeCompare(b, undefined, { sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}
