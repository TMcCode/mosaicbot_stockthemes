/** Process-lifetime cache so theme constituent sidecars survive tab toggles / remounts. */

export function themeSidecarCacheKey(dataBaseUrl: string, slug: string): string {
  return `${dataBaseUrl.replace(/\/$/, "")}\0${slug}`;
}

const stores = new Map<string, Map<string, unknown>>();

export function getThemeSidecarMemory<T>(namespace: string, key: string): T | undefined {
  return stores.get(namespace)?.get(key) as T | undefined;
}

export function setThemeSidecarMemory<T>(namespace: string, key: string, value: T): void {
  let bucket = stores.get(namespace);
  if (!bucket) {
    bucket = new Map();
    stores.set(namespace, bucket);
  }
  bucket.set(key, value);
}

/** Resolved outcomes worth reusing (skip network on later tab opens). */
export function isThemeSidecarTerminalStatus(
  status: string,
): status is "ok" | "absent" | "error" {
  return status === "ok" || status === "absent" || status === "error";
}
