import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { HomeExplorePathsV0 } from "@/types/home_explore_paths.v0";

const FIXTURE_REL = path.join("public", "fixtures", "home_explore_paths.v0.json");

function parseHomeExplorePaths(raw: string): HomeExplorePathsV0 {
  const data = parseJsonPayload<HomeExplorePathsV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported home_explore_paths schema_version: ${data.schema_version}`);
  }
  if (!data.as_of || !Array.isArray(data.paths)) {
    throw new Error("Invalid home_explore_paths JSON: missing as_of or paths");
  }
  return data;
}

export type HomeExplorePathsLoadResult = {
  bundle: HomeExplorePathsV0;
  source: "live" | "fixture";
};

export async function loadHomeExplorePaths(): Promise<HomeExplorePathsLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base}/home_explore_paths.v0.json`;
    try {
      const raw = await fetchPublicJsonText(url, "home_explore_paths.v0.json");
      return { bundle: parseHomeExplorePaths(raw), source: "live" };
    } catch {
      // Fall through to fixtures when live object is not published yet.
    }
  }

  const abs = path.join(process.cwd(), FIXTURE_REL);
  try {
    const raw = await readFile(abs, "utf-8");
    return { bundle: parseHomeExplorePaths(raw), source: "fixture" };
  } catch {
    return null;
  }
}
