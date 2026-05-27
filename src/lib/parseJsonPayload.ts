/**
 * Some upstream/cached responses can include a plain-text preamble (for example
 * "Source URL: ...") before the JSON object. Parse from the first object/array token.
 */
export function jsonPayloadStartIndex(raw: string): number {
  const text = String(raw ?? "");
  const objStart = text.indexOf("{");
  const arrStart = text.indexOf("[");
  const starts = [objStart, arrStart].filter((v) => v >= 0);
  return starts.length ? Math.min(...starts) : -1;
}

export function hasJsonPayloadStart(raw: string): boolean {
  return jsonPayloadStartIndex(raw) >= 0;
}

export function parseJsonPayload<T>(raw: string): T {
  const start = jsonPayloadStartIndex(raw);
  if (start < 0) {
    throw new Error("Invalid JSON payload: no object/array start token found");
  }
  return JSON.parse(String(raw).slice(start)) as T;
}
