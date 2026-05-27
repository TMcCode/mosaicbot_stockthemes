import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText, invalidateDevDiskCache } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { GroupDetailV0 } from "@/types/group.detail.v0";

const FIXTURE_DIR = path.join("public", "fixtures", "groups");

function parseGroupDetail(raw: string): GroupDetailV0 {
  const data = parseJsonPayload<GroupDetailV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported group detail schema_version: ${data.schema_version}`);
  }
  if (!data.slug || !data.name || !Array.isArray(data.themes)) {
    throw new Error("Invalid group detail JSON: missing slug, name, or themes");
  }
  return data;
}

async function loadLiveGroupDetail(slug: string, bypassDevCache: boolean): Promise<GroupDetailV0 | null> {
  const base = stockthemesPublicDataBase();
  if (!base) return null;
  const rel = `groups/${slug}.json`;
  const url = `${base}/groups/${encodeURIComponent(slug)}.json`;
  let raw: string;
  try {
    raw = await fetchPublicJsonText(url, rel, { bypassDevCache });
  } catch {
    return null;
  }
  try {
    return parseGroupDetail(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[stockthemes] Invalid group JSON for ${slug} (${msg}).`);
    return null;
  }
}

export type GroupDetailLoadResult = {
  detail: GroupDetailV0;
  source: "live" | "fixture";
};

/**
 * Loads groups/<slug>.json from the same public origin as the manifest, or from local fixtures.
 */
export async function loadGroupDetail(slug: string): Promise<GroupDetailLoadResult | null> {
  if (stockthemesPublicDataBase()) {
    let detail = await loadLiveGroupDetail(slug, false);
    if (!detail && process.env.NODE_ENV === "development") {
      await invalidateDevDiskCache(`groups/${slug}.json`);
      detail = await loadLiveGroupDetail(slug, true);
    }
    return detail ? { detail, source: "live" } : null;
  }

  const abs = path.join(process.cwd(), FIXTURE_DIR, `${slug}.json`);
  try {
    const raw = await readFile(abs, "utf-8");
    const detail = parseGroupDetail(raw);
    return { detail, source: "fixture" };
  } catch {
    return null;
  }
}
