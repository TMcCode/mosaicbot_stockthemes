import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { MostTalkedAboutV0 } from "@/types/most_talked_about.v0";

const FIXTURE_REL = path.join("public", "fixtures", "most_talked_about.v0.json");

function parseMostTalkedAbout(raw: string): MostTalkedAboutV0 {
  const data = parseJsonPayload<MostTalkedAboutV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported most_talked_about schema_version: ${data.schema_version}`);
  }
  if (!data.as_of || !Array.isArray(data.homepage) || !Array.isArray(data.pool)) {
    throw new Error("Invalid most_talked_about JSON: missing as_of, homepage, or pool");
  }
  return data;
}

export type MostTalkedAboutLoadResult = {
  bundle: MostTalkedAboutV0;
  source: "live" | "fixture";
};

/** Sheet-ordered Most talked about — preferred home table source. */
export async function loadMostTalkedAbout(): Promise<MostTalkedAboutLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base}/most_talked_about.v0.json`;
    try {
      const raw = await fetchPublicJsonText(url, "most_talked_about.v0.json");
      return { bundle: parseMostTalkedAbout(raw), source: "live" };
    } catch {
      return null;
    }
  }
  try {
    const raw = await readFile(path.join(process.cwd(), FIXTURE_REL), "utf-8");
    return { bundle: parseMostTalkedAbout(raw), source: "fixture" };
  } catch {
    return null;
  }
}
