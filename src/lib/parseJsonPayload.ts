/**
 * Some upstream/cached responses can include a plain-text preamble (for example
 * "Source URL: ...") before the JSON object. Parse from the first object/array token.
 */
export function parseJsonPayload<T>(raw: string): T {
  const text = String(raw ?? "");
  const objStart = text.indexOf("{");
  const arrStart = text.indexOf("[");
  const starts = [objStart, arrStart].filter((v) => v >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  if (start < 0) {
    throw new Error("Invalid JSON payload: no object/array start token found");
  }
  return JSON.parse(text.slice(start)) as T;
}
