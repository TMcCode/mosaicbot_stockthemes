/**
 * Warms `.cache/stockthemes-public/` before `next build` so CI/static export
 * reuses JSON across runs (cuts GCS egress). Also writes `public/search_index.v0.json`.
 *
 * Skips when STOCKTHEMES_USE_FIXTURES=1 or manifest URL is empty.
 * Set STOCKTHEMES_BUILD_CACHE_REFRESH=1 to force re-download all objects.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const CACHE_DIR = path.join(root, ".cache", "stockthemes-public");
const META_PATH = path.join(CACHE_DIR, "_build_cache_meta.json");
const SEARCH_OUT = path.join(root, "public", "search_index.v0.json");

const DEFAULT_MANIFEST = "https://data.stockthemes.ai/manifest.json";

const BUNDLE_FILES = [
  "search_index.v0.json",
  "home_trending.v0.json",
  "compare_themes.v0.json",
  "spy_snapshot.v0.json",
  "website_content.v0.json",
  "home_feed.v0.json",
];

function manifestUrl() {
  const explicit = process.env.NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL;
  if (explicit !== undefined && explicit.trim() === "") {
    return null;
  }
  if (process.env.STOCKTHEMES_USE_FIXTURES === "1") {
    return null;
  }
  return explicit?.trim() || DEFAULT_MANIFEST;
}

function publicDataBase(manifest) {
  try {
    const u = new URL(manifest);
    u.search = "";
    u.hash = "";
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    parts.pop();
    u.pathname = `/${parts.join("/")}`;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function readMeta() {
  try {
    return JSON.parse(fs.readFileSync(META_PATH, "utf8"));
  } catch {
    return null;
  }
}

function writeMeta(meta) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), "utf8");
}

function cachePath(rel) {
  return path.join(CACHE_DIR, rel.replace(/^\/+/, ""));
}

function cacheFileOk(rel) {
  try {
    const p = cachePath(rel);
    return fs.existsSync(p) && fs.statSync(p).size > 32;
  } catch {
    return false;
  }
}

/** Objects required for static export (home table, theme pages, search). */
function listWarmJobs(manifestJson, base) {
  const themeSlugs = (manifestJson.themes || []).map((t) => t?.slug).filter(Boolean);
  const groupSlugs = (manifestJson.groups || []).map((g) => g?.slug).filter(Boolean);
  return [
    ...themeSlugs.map((slug) => ({
      rel: `themes/${slug}.json`,
      url: `${base}/themes/${encodeURIComponent(slug)}.json`,
    })),
    ...groupSlugs.map((slug) => ({
      rel: `groups/${slug}.json`,
      url: `${base}/groups/${encodeURIComponent(slug)}.json`,
    })),
    ...BUNDLE_FILES.map((name) => ({
      rel: name,
      url: `${base}/${name}`,
    })),
  ];
}

function missingCacheRels(jobs) {
  return jobs.filter(({ rel }) => !cacheFileOk(rel)).map(({ rel }) => rel);
}

async function fetchToCache(url, rel) {
  const dest = cachePath(rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url}`);
  }
  const text = await res.text();
  fs.writeFileSync(dest, text, "utf8");
  return text;
}

async function pool(items, concurrency, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item !== undefined) {
        await fn(item);
      }
    }
  });
  await Promise.all(workers);
}

async function main() {
  if (process.env.STOCKTHEMES_BUILD_CACHE === "0") {
    console.log("sync-build-cache: skip (STOCKTHEMES_BUILD_CACHE=0)");
    return;
  }

  const manifest = manifestUrl();
  if (!manifest) {
    console.log("sync-build-cache: skip (no public manifest URL)");
    return;
  }

  const base = publicDataBase(manifest);
  if (!base) {
    console.log("sync-build-cache: skip (invalid manifest URL)");
    return;
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const manifestText = await fetchToCache(manifest, "manifest.json");
  const manifestJson = JSON.parse(manifestText);
  const asOf = String(manifestJson.as_of || "");
  const buildId = String(manifestJson.build_id || "");
  const prev = readMeta();
  const force = process.env.STOCKTHEMES_BUILD_CACHE_REFRESH === "1";
  const allJobs = listWarmJobs(manifestJson, base);
  const themeCount = (manifestJson.themes || []).filter((t) => t?.slug).length;
  const missing = missingCacheRels(allJobs);
  const unchanged =
    !force &&
    prev &&
    prev.as_of === asOf &&
    prev.manifestUrl === manifest &&
    missing.length === 0;

  const themeFilesOnDisk = fs.existsSync(cachePath("themes"))
    ? fs.readdirSync(cachePath("themes")).filter((f) => f.endsWith(".json")).length
    : 0;

  if (unchanged) {
    console.log(
      `sync-build-cache: manifest as_of=${asOf} unchanged — cache complete (${allJobs.length} objects, theme files=${themeFilesOnDisk}/${themeCount})`,
    );
    if (themeFilesOnDisk < themeCount) {
      console.error(
        `sync-build-cache: theme file count mismatch (have ${themeFilesOnDisk}, need ${themeCount}) — refusing fast path`,
      );
      process.exit(1);
    }
  } else {
    if (!force && prev && prev.as_of === asOf && prev.manifestUrl === manifest && missing.length > 0) {
      console.warn(
        `sync-build-cache: as_of unchanged but ${missing.length} cached file(s) missing — re-warming`,
      );
    }
    const jobs =
      missing.length > 0 && !force
        ? allJobs.filter(({ rel }) => missing.includes(rel))
        : allJobs;

    console.log(
      `sync-build-cache: warming ${jobs.length} objects (themes=${themeCount} groups=${(manifestJson.groups || []).length})`,
    );

    let ok = 0;
    let fail = 0;
    await pool(jobs, 12, async ({ rel, url }) => {
      try {
        await fetchToCache(url, rel);
        ok += 1;
      } catch (e) {
        fail += 1;
        console.warn(`sync-build-cache: failed ${rel}:`, e instanceof Error ? e.message : e);
      }
    });
    console.log(`sync-build-cache: done ok=${ok} fail=${fail}`);

    const stillMissing = missingCacheRels(allJobs);
    const missingThemes = stillMissing.filter((r) => r.startsWith("themes/")).length;
    if (fail > 0 || missingThemes > 0) {
      console.error(
        `sync-build-cache: incomplete — failed=${fail} missing_themes=${missingThemes}/${themeCount}`,
      );
      if (stillMissing.length <= 8) {
        console.error(`missing: ${stillMissing.join(", ")}`);
      }
      process.exit(1);
    }

    writeMeta({ as_of: asOf, build_id: buildId, manifestUrl: manifest, warmedAt: new Date().toISOString() });
  }

  const searchCached = cachePath("search_index.v0.json");
  if (fs.existsSync(searchCached)) {
    fs.mkdirSync(path.dirname(SEARCH_OUT), { recursive: true });
    fs.copyFileSync(searchCached, SEARCH_OUT);
    console.log("sync-build-cache: copied search_index → public/");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
