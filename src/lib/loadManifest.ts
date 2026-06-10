import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { normalizePublicJsonUrl } from "@/lib/stockthemesClientConfig";
import { STOCKTHEMES_DEFAULT_MANIFEST_URL } from "@/lib/stockthemesDefaultManifestUrl";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import type { ManifestV0 } from "@/types/manifest.v0";

const FIXTURE_REL = path.join("public", "fixtures", "manifest.json");

/** Full URL to manifest.json (e.g. public GCS). Inlined for server + optional client use. */
function manifestUrl(): string | undefined {
  if (process.env.STOCKTHEMES_USE_FIXTURES === "1") {
    return undefined;
  }
  const fromEnv = process.env.NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL?.trim();
  if (fromEnv) {
    return normalizePublicJsonUrl(fromEnv);
  }
  return STOCKTHEMES_DEFAULT_MANIFEST_URL;
}

function parseManifest(raw: string): ManifestV0 {
  const data = parseJsonPayload<ManifestV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported manifest schema_version: ${data.schema_version}`);
  }
  return data;
}

export type ManifestLoadResult = {
  manifest: ManifestV0;
  /** `live` = fetched from NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL */
  source: "live" | "fixture";
};

/**
 * Loads manifest v0: remote URL (env, else default public bucket), unless STOCKTHEMES_USE_FIXTURES=1
 * for local fixture-only builds. Server-side fetch does not require GCS CORS (only browsers do).
 */
export async function loadManifest(): Promise<ManifestLoadResult> {
  const url = manifestUrl();
  if (url) {
    const raw = await fetchPublicJsonText(url, "manifest.json");
    let manifest = parseManifest(raw);

    // In local dev, if manifest looks stale, force one live refresh bypassing disk cache.
    if (process.env.NODE_ENV === "development") {
      const asOfTs = Date.parse(String(manifest.as_of || ""));
      const ageMs = Number.isFinite(asOfTs) ? Date.now() - asOfTs : 0;
      const staleMs = 36 * 60 * 60 * 1000; // 36h
      if (ageMs > staleMs) {
        try {
          const freshRaw = await fetchPublicJsonText(url, "manifest.json", { bypassDevCache: true });
          manifest = parseManifest(freshRaw);
        } catch {
          // Keep the previously loaded manifest; do not fail hard on transient fetch errors.
        }
      }
    }

    return { manifest, source: "live" };
  }

  const abs = path.join(process.cwd(), FIXTURE_REL);
  const raw = await readFile(abs, "utf-8");
  const manifest = parseManifest(raw);
  return { manifest, source: "fixture" };
}
