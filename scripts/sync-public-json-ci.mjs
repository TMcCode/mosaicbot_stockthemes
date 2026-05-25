/**
 * CI: sync public JSON into .cache/stockthemes-public (optionally purge first).
 *
 * FULL_CACHE_REFRESH only on manual workflow input / force — not on routine publish bumps.
 * Incremental sync uses R2/CDN ETag (see sync-build-cache.mjs).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const CACHE_DIR = path.join(root, ".cache", "stockthemes-public");

function purgeThemeGroupCache() {
  fs.rmSync(path.join(CACHE_DIR, "themes"), { recursive: true, force: true });
  fs.rmSync(path.join(CACHE_DIR, "groups"), { recursive: true, force: true });
  const meta = path.join(CACHE_DIR, "_build_cache_meta.json");
  if (fs.existsSync(meta)) {
    fs.unlinkSync(meta);
  }
  console.log("sync-public-json-ci: purged themes/groups + _build_cache_meta");
}

function countThemeFiles() {
  const themesDir = path.join(CACHE_DIR, "themes");
  if (!fs.existsSync(themesDir)) {
    return 0;
  }
  return fs.readdirSync(themesDir).filter((f) => f.endsWith(".json")).length;
}

function main() {
  const fullRefresh =
    process.env.FULL_CACHE_REFRESH === "true" || process.env.FULL_CACHE_REFRESH === "1";

  const env = { ...process.env };
  if (fullRefresh) {
    purgeThemeGroupCache();
    env.STOCKTHEMES_BUILD_CACHE_REFRESH = "1";
  } else {
    console.log("sync-public-json-ci: incremental sync (no purge)");
  }

  const sync = spawnSync("node", ["scripts/sync-build-cache.mjs"], {
    cwd: root,
    stdio: "inherit",
    env,
  });
  if (sync.status !== 0) {
    process.exit(sync.status ?? 1);
  }

  const themeCount = countThemeFiles();
  console.log(`sync-public-json-ci: cached theme JSON files: ${themeCount}`);
  if (themeCount < 50) {
    console.error(
      "::error::Expected 50+ theme JSON files in .cache/stockthemes-public/themes — run with full_cache_refresh",
    );
    process.exit(1);
  }
}

main();
