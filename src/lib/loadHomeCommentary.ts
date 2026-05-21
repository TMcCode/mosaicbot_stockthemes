import { readFile } from "fs/promises";
import path from "path";

import { homeCommentaryCacheRel, homeCommentaryFetchUrl } from "@/lib/homeCommentaryUrl";
import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import type { HomeCommentaryV0 } from "@/types/home_commentary.v0";

const FIXTURE_REL = path.join("public", "fixtures", "home_commentary.v0.json");

function parseHomeCommentary(raw: string): HomeCommentaryV0 {
  const data = parseJsonPayload<HomeCommentaryV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported home_commentary schema_version: ${data.schema_version}`);
  }
  if (!Array.isArray(data.items)) {
    throw new Error("Invalid home_commentary JSON: missing items array");
  }
  return data;
}

export type HomeCommentaryLoadResult = {
  commentary: HomeCommentaryV0;
  source: "live" | "fixture";
};

export async function loadHomeCommentary(): Promise<HomeCommentaryLoadResult | null> {
  const url = homeCommentaryFetchUrl();
  if (url) {
    try {
      const raw = await fetchPublicJsonText(url, homeCommentaryCacheRel());
      return { commentary: parseHomeCommentary(raw), source: "live" };
    } catch {
      return null;
    }
  }
  if (process.env.STOCKTHEMES_USE_FIXTURES !== "1") {
    return null;
  }
  try {
    const abs = path.join(process.cwd(), FIXTURE_REL);
    const raw = await readFile(abs, "utf-8");
    return { commentary: parseHomeCommentary(raw), source: "fixture" };
  } catch {
    return null;
  }
}
