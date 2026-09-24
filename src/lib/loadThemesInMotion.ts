import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { ThemesInMotionV0 } from "@/types/themes_in_motion.v0";

const FIXTURE_REL = path.join("public", "fixtures", "themes_in_motion.v0.json");

function parseMotions(raw: string): ThemesInMotionV0 {
  const data = parseJsonPayload<ThemesInMotionV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported themes_in_motion schema_version: ${data.schema_version}`);
  }
  if (!data.as_of || !Array.isArray(data.homepage) || !Array.isArray(data.pool)) {
    throw new Error("Invalid themes_in_motion JSON: missing as_of, homepage, or pool");
  }
  return data;
}

export type ThemesInMotionLoadResult = {
  bundle: ThemesInMotionV0;
  source: "live" | "fixture";
};

/** Loads merged Motions pool — homepage reads only `homepage` (≤10 rows). */
export async function loadThemesInMotion(): Promise<ThemesInMotionLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base}/themes_in_motion.v0.json`;
    try {
      const raw = await fetchPublicJsonText(url, "themes_in_motion.v0.json");
      return { bundle: parseMotions(raw), source: "live" };
    } catch {
      return null;
    }
  }
  try {
    const raw = await readFile(path.join(process.cwd(), FIXTURE_REL), "utf-8");
    return { bundle: parseMotions(raw), source: "fixture" };
  } catch {
    return null;
  }
}
