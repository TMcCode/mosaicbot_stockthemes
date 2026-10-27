/** Pull `as_of` from the start of search_index JSON (Range peek or full body). */
export function parseAsOfFromSearchIndexPrefix(text: string): string | null {
  const m = String(text ?? "").match(/"as_of"\s*:\s*"([^"]+)"/);
  return m?.[1] ?? null;
}

/** True when candidate as_of is strictly newer than current. */
export function searchIndexAsOfNewer(candidate: string, current: string): boolean {
  const c = Date.parse(candidate);
  const u = Date.parse(current);
  if (Number.isFinite(c) && Number.isFinite(u)) {
    return c > u;
  }
  return candidate > current;
}
