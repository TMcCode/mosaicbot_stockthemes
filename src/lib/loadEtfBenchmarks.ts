import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { EtfBenchmarksV0 } from "@/types/etf_benchmarks.v0";

const FIXTURE_REL = path.join("public", "fixtures", "etf_benchmarks.v0.json");

let memoizedBenchmarksPromise: Promise<EtfBenchmarksLoadResult | null> | null = null;

function parseEtfBenchmarks(raw: string): EtfBenchmarksV0 {
  const data = parseJsonPayload<EtfBenchmarksV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported etf_benchmarks schema_version: ${data.schema_version}`);
  }
  if (!data.as_of || !Array.isArray(data.rows)) {
    throw new Error("Invalid etf_benchmarks JSON: missing as_of or rows");
  }
  return data;
}

export type EtfBenchmarksLoadResult = {
  bundle: EtfBenchmarksV0;
  source: "live" | "fixture";
};

async function loadEtfBenchmarksInternal(): Promise<EtfBenchmarksLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base}/etf_benchmarks.v0.json`;
    try {
      const raw = await fetchPublicJsonText(url, "etf_benchmarks.v0.json");
      const bundle = parseEtfBenchmarks(raw);
      return { bundle, source: "live" };
    } catch {
      // CDN may not have etf_benchmarks until next ETL publish — fall back to fixture.
    }
  }

  const abs = path.join(process.cwd(), FIXTURE_REL);
  try {
    const raw = await readFile(abs, "utf-8");
    const bundle = parseEtfBenchmarks(raw);
    return { bundle, source: "fixture" };
  } catch {
    return null;
  }
}

/** Compact SPY + sector SPDR rows for /compare (memoized outside dev). */
export async function loadEtfBenchmarks(): Promise<EtfBenchmarksLoadResult | null> {
  if (process.env.NODE_ENV !== "development") {
    if (!memoizedBenchmarksPromise) {
      memoizedBenchmarksPromise = loadEtfBenchmarksInternal();
    }
    return memoizedBenchmarksPromise;
  }
  return loadEtfBenchmarksInternal();
}
