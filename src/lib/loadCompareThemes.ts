import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { CompareThemesV0 } from "@/types/compare_themes.v0";

const FIXTURE_REL = path.join("public", "fixtures", "compare_themes.v0.json");

function parseCompareThemes(raw: string): CompareThemesV0 {
  const data = parseJsonPayload<CompareThemesV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported compare_themes schema_version: ${data.schema_version}`);
  }
  if (!data.as_of || !Array.isArray(data.rows)) {
    throw new Error("Invalid compare_themes JSON: missing as_of or rows");
  }
  return data;
}

export type CompareThemesLoadResult = {
  bundle: CompareThemesV0;
  source: "live" | "fixture";
};

export async function loadCompareThemes(): Promise<CompareThemesLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base}/compare_themes.v0.json`;
    let raw: string;
    try {
      raw = await fetchPublicJsonText(url, "compare_themes.v0.json");
    } catch {
      return null;
    }
    const bundle = parseCompareThemes(raw);
    return { bundle, source: "live" };
  }

  const abs = path.join(process.cwd(), FIXTURE_REL);
  try {
    const raw = await readFile(abs, "utf-8");
    const bundle = parseCompareThemes(raw);
    return { bundle, source: "fixture" };
  } catch {
    return null;
  }
}
