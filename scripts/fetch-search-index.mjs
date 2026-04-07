/**
 * Writes public/search_index.v0.json before static export so the browser loads search
 * from the same origin (avoids blocked third-party fetches to storage.googleapis.com).
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "public", "search_index.v0.json");

const DEFAULT_MANIFEST =
  "https://storage.googleapis.com/stockthemes-public/manifest.json";

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
  try {
    const u = new URL(raw);
    u.search = "";
    u.hash = "";
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      return null;
    }
    parts.pop();
    u.pathname = `/${parts.join("/")}/search_index.v0.json`;
    return u.toString();
  } catch {
    return null;
  }
}

async function main() {
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
