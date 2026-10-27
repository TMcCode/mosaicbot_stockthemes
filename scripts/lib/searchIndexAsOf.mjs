/** Parse `as_of` from the leading bytes of search_index.v0.json. */
export function parseAsOfFromSearchIndexPrefix(text) {
  const m = String(text ?? "").match(/"as_of"\s*:\s*"([^"]+)"/);
  return m?.[1] ?? "";
}

/**
 * Cheap live as_of for search_index (Range peek via public CDN URL).
 * Avoids downloading the full ~2MB object in CI gate checks.
 */
export async function fetchSearchIndexAsOf(baseUrl) {
  const base = String(baseUrl || "").replace(/\/$/, "");
  if (!base) return "";
  const url = `${base}/search_index.v0.json`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Range: "bytes=0-511",
      "User-Agent": "stockthemes-ci-should-build",
    },
  });
  if (!(res.ok || res.status === 206)) {
    throw new Error(`search_index HTTP ${res.status} from ${url}`);
  }
  return parseAsOfFromSearchIndexPrefix(await res.text());
}
