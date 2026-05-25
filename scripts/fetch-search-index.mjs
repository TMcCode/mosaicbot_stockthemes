/**
 * Writes public/search_index.v0.json before static export so the browser loads search
 * from the same origin.
 *
 * Resolution order matches src/lib/stockthemesPublicBase.ts + searchIndexUrl.ts:
 * - NEXT_PUBLIC_STOCKTHEMES_SEARCH_INDEX_URL — use as-is
 * - STOCKTHEMES_USE_FIXTURES=1 — copy public/fixtures/search_index.v0.json
 * - NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL empty — skip (site uses in-repo fixtures path)
 * - Else derive from manifest URL or default public bucket
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { publicDataBaseFromManifest } from "./lib/publicDataBase.mjs";
import { STOCKTHEMES_PUBLIC_MANIFEST_URL } from "./lib/storageConfig.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "public", "search_index.v0.json");

const DEFAULT_MANIFEST = STOCKTHEMES_PUBLIC_MANIFEST_URL;

function loadLocalEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (key && process.env[key] === undefined) {
        process.env[key] = rest.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

function searchIndexUpstreamUrl() {
  const override = process.env.NEXT_PUBLIC_STOCKTHEMES_SEARCH_INDEX_URL?.trim();
  if (override) {
    return override;
  }
  if (process.env.STOCKTHEMES_USE_FIXTURES === "1") {
    return null;
  }
  const explicit = process.env.NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL;
  if (explicit !== undefined && explicit.trim() === "") {
    return null;
  }
  const raw = explicit?.trim() || DEFAULT_MANIFEST;
  const base = publicDataBaseFromManifest(raw);
  if (!base) {
    return null;
  }
  return `${base}/search_index.v0.json`;
}

async function main() {
  loadLocalEnv();

  if (
    fs.existsSync(outPath) &&
    (process.env.STOCKTHEMES_STATIC_PAGES === "1" ||
      process.env.STOCKTHEMES_BUILD_CACHE === "1" ||
      process.env.STOCKTHEMES_SYNC_VIA_R2 === "1")
  ) {
    console.log("fetch-search-index: skip (sync-build-cache already wrote public/search_index.v0.json)");
    return;
  }

  const upstream = searchIndexUpstreamUrl();
  if (!upstream) {
    if (process.env.STOCKTHEMES_USE_FIXTURES === "1") {
      const fixtures = path.join(root, "public", "fixtures", "search_index.v0.json");
      if (fs.existsSync(fixtures)) {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.copyFileSync(fixtures, outPath);
        console.log("fetch-search-index: copied fixtures → public/search_index.v0.json");
      }
      return;
    }
    console.log("fetch-search-index: skip (no public bucket / override)");
    return;
  }

  const res = await fetch(upstream);
  if (!res.ok) {
    throw new Error(`fetch-search-index: HTTP ${res.status} from ${upstream}`);
  }
  const text = await res.text();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, text, "utf8");
  console.log("fetch-search-index: wrote public/search_index.v0.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
