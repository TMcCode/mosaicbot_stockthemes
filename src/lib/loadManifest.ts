import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { STOCKTHEMES_DEFAULT_MANIFEST_URL } from "@/lib/stockthemesDefaultManifestUrl";
import { stockthemesLiveFetchInit } from "@/lib/stockthemesPublicBase";
import type { ManifestV0 } from "@/types/manifest.v0";

const FIXTURE_REL = path.join("public", "fixtures", "manifest.json");

/** Full URL to manifest.json (e.g. public GCS). Inlined for server + optional client use. */
function manifestUrl(): string | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (process.env.STOCKTHEMES_USE_FIXTURES === "1") {
    return undefined;
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
    const res = await fetch(url, stockthemesLiveFetchInit());
    if (!res.ok) {
      throw new Error(`Manifest fetch failed ${res.status}: ${url}`);
    }
    const manifest = parseManifest(await res.text());
    return { manifest, source: "live" };
  }

  const abs = path.join(process.cwd(), FIXTURE_REL);
  const raw = await readFile(abs, "utf-8");
  const manifest = parseManifest(raw);
  return { manifest, source: "fixture" };
}
