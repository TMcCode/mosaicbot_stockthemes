import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { FactorSpreadsV0 } from "@/types/factor_spreads.v0";

const FIXTURE_REL = path.join("public", "fixtures", "factor_spreads.v0.json");

let memoizedPromise: Promise<FactorSpreadsLoadResult | null> | null = null;

function parseFactorSpreads(raw: string): FactorSpreadsV0 {
  const data = parseJsonPayload<FactorSpreadsV0>(raw);
  if (data.schema_version !== "factor_spreads.v0") {
    throw new Error(`Unsupported factor_spreads schema_version: ${data.schema_version}`);
  }
  if (!data.as_of || !Array.isArray(data.rows)) {
    throw new Error("Invalid factor_spreads JSON: missing as_of or rows");
  }
  return data;
}

export type FactorSpreadsLoadResult = {
  bundle: FactorSpreadsV0;
  source: "live" | "fixture";
};

async function loadFactorSpreadsInternal(): Promise<FactorSpreadsLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base}/factor_spreads.v0.json`;
    try {
      const raw = await fetchPublicJsonText(url, "factor_spreads.v0.json");
      const bundle = parseFactorSpreads(raw);
      return { bundle, source: "live" };
    } catch {
      // CDN may not have factor_spreads until next factor sidecar publish.
    }
  }

  const abs = path.join(process.cwd(), FIXTURE_REL);
  try {
    const raw = await readFile(abs, "utf-8");
    const bundle = parseFactorSpreads(raw);
    return { bundle, source: "fixture" };
  } catch {
    return null;
  }
}

/** Non-sector factor spread compare rows for /compare (memoized outside dev). */
export async function loadFactorSpreads(): Promise<FactorSpreadsLoadResult | null> {
  if (process.env.NODE_ENV !== "development") {
    if (!memoizedPromise) {
      memoizedPromise = loadFactorSpreadsInternal();
    }
    return memoizedPromise;
  }
  return loadFactorSpreadsInternal();
}
