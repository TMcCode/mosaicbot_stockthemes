import { readFile } from "fs/promises";
import path from "path";

import type { ManifestV0 } from "@/types/manifest.v0";

const FIXTURE_REL = path.join("public", "fixtures", "manifest.json");

/** Full URL to manifest.json (e.g. public GCS). Inlined for server + optional client use. */
function manifestUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL?.trim() || undefined;
}

function parseManifest(raw: string): ManifestV0 {
  const data = JSON.parse(raw) as ManifestV0;
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
 * Loads manifest v0: remote URL if NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL is set, else local fixture.
 * Server-side fetch does not require GCS CORS (only browsers do).
 */
export async function loadManifest(): Promise<ManifestLoadResult> {
  const url = manifestUrl();
  if (url) {
    // `cache: "no-store"` opts out of static generation; static export (`output: "export"`)
    // needs build-time fetch to succeed. Use no-store only in dev for fresher reloads.
    const isDev = process.env.NODE_ENV === "development";
    const res = await fetch(url, isDev ? { cache: "no-store" } : {});
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
