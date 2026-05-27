import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { HomeTopMoversV0 } from "@/types/home_top_movers.v0";

const FIXTURE_REL = path.join("public", "fixtures", "home_top_movers.v0.json");

function parseHomeTopMovers(raw: string): HomeTopMoversV0 {
  const data = parseJsonPayload<HomeTopMoversV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported home_top_movers schema_version: ${data.schema_version}`);
  }
  if (!data.as_of || !Array.isArray(data.movers_1d) || !Array.isArray(data.movers_10d)) {
    throw new Error("Invalid home_top_movers JSON: missing as_of or mover lists");
  }
  return data;
}

export type HomeTopMoversLoadResult = {
  bundle: HomeTopMoversV0;
  source: "live" | "fixture";
};

export async function loadHomeTopMovers(): Promise<HomeTopMoversLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base}/home_top_movers.v0.json`;
    try {
      const raw = await fetchPublicJsonText(url, "home_top_movers.v0.json");
      return { bundle: parseHomeTopMovers(raw), source: "live" };
    } catch {
      return null;
    }
  }

  const abs = path.join(process.cwd(), FIXTURE_REL);
  try {
    const raw = await readFile(abs, "utf-8");
    return { bundle: parseHomeTopMovers(raw), source: "fixture" };
  } catch {
    return null;
  }
}
