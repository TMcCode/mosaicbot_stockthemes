import { readFile } from "fs/promises";
import path from "path";

import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { GroupDetailV0 } from "@/types/group.detail.v0";

const FIXTURE_DIR = path.join("public", "fixtures", "groups");

function parseGroupDetail(raw: string): GroupDetailV0 {
  const data = JSON.parse(raw) as GroupDetailV0;
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported group detail schema_version: ${data.schema_version}`);
  }
  if (!data.slug || !data.name || !Array.isArray(data.themes)) {
    throw new Error("Invalid group detail JSON: missing slug, name, or themes");
  }
  return data;
}

export type GroupDetailLoadResult = {
  detail: GroupDetailV0;
  source: "live" | "fixture";
};

/**
 * Loads groups/<slug>.json from the same public origin as the manifest, or from local fixtures.
 */
export async function loadGroupDetail(slug: string): Promise<GroupDetailLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base}/groups/${encodeURIComponent(slug)}.json`;
    const devNoStore =
      process.env.NODE_ENV === "development" && process.env.STOCKTHEMES_DEV_NO_STORE === "1";
    const res = await fetch(url, devNoStore ? { cache: "no-store" } : { next: { revalidate: 300 } });
    if (!res.ok) {
      return null;
    }
    const detail = parseGroupDetail(await res.text());
    return { detail, source: "live" };
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
