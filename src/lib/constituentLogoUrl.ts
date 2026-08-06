import { STOCKTHEMES_CDN_ORIGIN } from "@/lib/stockthemesCdnOrigin";

export type LogoPresentIndexV0 = {
  schema_version: number;
  base: string;
  ext: Record<string, string>;
};

export type LogoPresenceMap = Map<string, string>;

const PRESENT_URL = `${STOCKTHEMES_CDN_ORIGIN}/logos/v0/present.v0.json`;

let presencePromise: Promise<LogoPresenceMap | null> | null = null;
let presenceCache: LogoPresenceMap | null | undefined;

function normalizeExt(ext: string): string {
  const e = ext.trim().toLowerCase();
  if (e === "jpeg") return "jpg";
  return e || "png";
}

function buildPresenceMap(data: LogoPresentIndexV0): LogoPresenceMap {
  const base = String(data.base || `${STOCKTHEMES_CDN_ORIGIN}/logos/v0/`).replace(/\/?$/, "/");
  const out: LogoPresenceMap = new Map();
  const ext = data.ext && typeof data.ext === "object" ? data.ext : {};
  for (const [ticker, rawExt] of Object.entries(ext)) {
    const t = String(ticker || "")
      .trim()
      .toUpperCase();
    if (!t) continue;
    const e = normalizeExt(String(rawExt || "png"));
    out.set(t, `${base}${encodeURIComponent(t)}.${e === "jpg" ? "jpeg" : e}`);
  }
  return out;
}

/** One fetch per page session; null means index missing/failed (use legacy fallback). */
export function loadLogoPresenceMap(): Promise<LogoPresenceMap | null> {
  if (presenceCache !== undefined) {
    return Promise.resolve(presenceCache);
  }
  if (presencePromise) return presencePromise;
  presencePromise = (async () => {
    try {
      const res = await fetch(PRESENT_URL, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "force-cache",
      });
      if (!res.ok) {
        presenceCache = null;
        return null;
      }
      const data = (await res.json()) as LogoPresentIndexV0;
      if (!data || typeof data !== "object" || !data.ext) {
        presenceCache = null;
        return null;
      }
      presenceCache = buildPresenceMap(data);
      return presenceCache;
    } catch {
      presenceCache = null;
      return null;
    } finally {
      presencePromise = null;
    }
  })();
  return presencePromise;
}

/**
 * Prefer theme JSON ``logo_url``; else presence-index URL; else optional png guess
 * when the presence index is unavailable.
 */
export function resolveConstituentLogoUrl(
  logoUrl: string | null | undefined,
  ticker: string,
  presence?: LogoPresenceMap | null,
): string | null {
  const fromJson = typeof logoUrl === "string" ? logoUrl.trim() : "";
  if (fromJson) return fromJson;

  const t = String(ticker || "")
    .trim()
    .toUpperCase()
    .replace(/\//g, "_");
  if (!t) return null;

  if (presence && presence.size > 0) {
    return presence.get(t) ?? null;
  }
  // Index not loaded / missing: keep temporary png guess so logos still show.
  if (presence === null) {
    return `${STOCKTHEMES_CDN_ORIGIN}/logos/v0/${encodeURIComponent(t)}.png`;
  }
  // presence === undefined → still loading; caller should wait.
  return null;
}
