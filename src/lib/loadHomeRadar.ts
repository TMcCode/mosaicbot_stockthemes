import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { HomeRadarV0 } from "@/types/home_radar.v0";

const FIXTURE_REL = path.join("public", "fixtures", "home_radar.v0.json");

function parseHomeRadar(raw: string): HomeRadarV0 {
  const data = parseJsonPayload<HomeRadarV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported home_radar schema_version: ${data.schema_version}`);
  }
  if (!data.as_of || !data.tabs) {
    throw new Error("Invalid home_radar JSON: missing as_of or tabs");
  }
  return data;
}

export type HomeRadarLoadResult = {
  bundle: HomeRadarV0;
  source: "live" | "fixture";
};

/** Loads precomputed Narrative Radar — never scores themes client-side. */
export async function loadHomeRadar(): Promise<HomeRadarLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base}/home_radar.v0.json`;
    try {
      const raw = await fetchPublicJsonText(url, "home_radar.v0.json");
      return { bundle: parseHomeRadar(raw), source: "live" };
    } catch {
      return null;
    }
  }
  try {
    const raw = await readFile(path.join(process.cwd(), FIXTURE_REL), "utf-8");
    return { bundle: parseHomeRadar(raw), source: "fixture" };
  } catch {
    return null;
  }
}
