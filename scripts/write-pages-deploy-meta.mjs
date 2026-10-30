/**
 * After a successful static export, record publish as_of values for scheduled CI skip logic.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { themeSlugFingerprint } from "./lib/objectMeta.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const CACHE_DIR = path.join(root, ".cache", "stockthemes-public");
const META_PATH = path.join(CACHE_DIR, "_pages_deploy_meta.json");
const MANIFEST_CACHE = path.join(CACHE_DIR, "manifest.json");
const HOME_TRENDING_CACHE = path.join(CACHE_DIR, "home_trending.v0.json");
const SEARCH_INDEX_CACHE = path.join(CACHE_DIR, "search_index.v0.json");

function readAsOf(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return String(data.as_of || "");
  } catch {
    return "";
  }
}

function main() {
  const asOf = readAsOf(MANIFEST_CACHE);
  const homeTrendingAsOf = readAsOf(HOME_TRENDING_CACHE);
  const searchIndexAsOf = readAsOf(SEARCH_INDEX_CACHE);
  let buildId = "";
  let themeSlugFp = "";
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_CACHE, "utf8"));
    buildId = String(manifest.build_id || "");
    themeSlugFp = themeSlugFingerprint(manifest);
  } catch {
    console.warn("write-pages-deploy-meta: no cached manifest.json");
  }

  const outStocks = path.join(root, "out", "stocks");
  let stockPageCount = 0;
  try {
    stockPageCount = fs
      .readdirSync(outStocks)
      .filter((n) => n.endsWith(".html")).length;
  } catch {
    /* no out/stocks yet */
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(
    META_PATH,
    JSON.stringify(
      {
        as_of: asOf,
        home_trending_as_of: homeTrendingAsOf,
        search_index_as_of: searchIndexAsOf,
        build_id: buildId,
        theme_slug_fingerprint: themeSlugFp,
        stock_page_count: stockPageCount,
        stock_sync_stocks: process.env.STOCKTHEMES_SYNC_STOCKS || "0",
        stock_sync_tickers: process.env.STOCKTHEMES_SYNC_STOCK_TICKERS || "",
        deployed_at: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(
    `write-pages-deploy-meta: as_of=${asOf} home_trending_as_of=${homeTrendingAsOf} search_index_as_of=${searchIndexAsOf} stock_pages=${stockPageCount}`,
  );
}

main();
