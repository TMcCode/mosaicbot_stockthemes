import { STOCKTHEMES_PUBLIC_BASE_URL } from "@/lib/stockthemesStorageConfig";

const thesisCache = new Map<string, string>();
const thesisInflight = new Map<string, Promise<string>>();

function thesisFromThemePayload(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const tt = (data as { theme_thesis?: unknown }).theme_thesis;
  if (!tt || typeof tt !== "object") return "";
  const block = tt as { thesis?: unknown; bull_case?: unknown };
  const thesis = String(block.thesis || "").trim();
  if (thesis) return thesis;
  // Some themes publish bull/bear before the prose thesis lands.
  if (Array.isArray(block.bull_case)) {
    for (const b of block.bull_case) {
      const line = String(b || "").trim();
      if (line) return line;
    }
  }
  return "";
}

function thesisFetchUrl(slug: string): string {
  const path = `themes/${encodeURIComponent(slug)}.json`;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // next.dev rewrite avoids CDN CORS when using a non-whitelisted port.
    if (host === "localhost" || host === "127.0.0.1") {
      return `/stockthemes-data/${path}`;
    }
  }
  return `${STOCKTHEMES_PUBLIC_BASE_URL}/${path}`;
}

/** Browser fetch of theme thesis blurb (module-cached). Empty string = missing. */
export function fetchFeedThesisPreview(slug: string): Promise<string> {
  const key = String(slug || "").trim();
  if (!key) return Promise.resolve("");
  const hit = thesisCache.get(key);
  if (hit !== undefined) return Promise.resolve(hit);
  const pending = thesisInflight.get(key);
  if (pending) return pending;

  const url = thesisFetchUrl(key);
  const p = fetch(url, { mode: "cors", credentials: "omit" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`thesis ${res.status}`);
      const data = (await res.json()) as unknown;
      return thesisFromThemePayload(data);
    })
    .then((text) => {
      thesisCache.set(key, text);
      thesisInflight.delete(key);
      return text;
    })
    .catch(() => {
      // Don't cache failures — allow a later flip / remount to retry.
      thesisInflight.delete(key);
      return "";
    });

  thesisInflight.set(key, p);
  return p;
}

export function feedEventNeedsThesisHydration(
  evt: {
    kind?: string;
    theme_slug?: string | null;
    thesis_preview?: string | null;
    thesis_themes?: Array<{ slug?: string | null }> | null;
  },
  thesisBySlug?: Record<string, string>,
): string | null {
  if (evt.kind !== "text_table_update") return null;
  if (String(evt.thesis_preview || "").trim()) return null;
  const slug =
    String(evt.theme_slug || "").trim() ||
    String(evt.thesis_themes?.[0]?.slug || "").trim();
  if (!slug) return null;
  if (String(thesisBySlug?.[slug] || "").trim()) return null;
  return slug;
}
