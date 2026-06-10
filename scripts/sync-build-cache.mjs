/**
 * Warms `.cache/stockthemes-public/` before `next build` so CI/static export
 * reuses JSON across runs. Also writes `public/search_index.v0.json`.
 *
 * Skips when STOCKTHEMES_USE_FIXTURES=1 or manifest URL is empty.
 * Set STOCKTHEMES_BUILD_CACHE_REFRESH=1 to force re-download all objects.
 *
 * When manifest.as_of changes, theme/group JSON is refreshed incrementally via
 * R2/Cdn ETag — unchanged objects are not re-downloaded.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { downloadGcsObject, gcsSyncEnabled, loadGcsServiceAccount } from "./lib/gcsDownload.mjs";
import {
  fetchRemoteObjectMetadata,
  isBundleRel,
  isDetailJsonRel,
  readObjectMetaSidecar,
  recordObjectMeta,
  selectJobsToDownload,
  themeSlugFingerprint,
  writeObjectMetaSidecar,
} from "./lib/objectMeta.mjs";
import { normalizePublicJsonUrl, publicDataBaseFromManifest } from "./lib/publicDataBase.mjs";
import { STOCKTHEMES_PUBLIC_MANIFEST_URL } from "./lib/storageConfig.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const CACHE_DIR = path.join(root, ".cache", "stockthemes-public");
const META_PATH = path.join(CACHE_DIR, "_build_cache_meta.json");
const OBJECT_META_PATH = path.join(CACHE_DIR, "_object_meta.json");
const SEARCH_OUT = path.join(root, "public", "search_index.v0.json");

const DEFAULT_MANIFEST = STOCKTHEMES_PUBLIC_MANIFEST_URL;

const BUNDLE_FILES = [
  "search_index.v0.json",
  "home_trending.v0.json",
  "home_top_movers.v0.json",
  "compare_themes.v0.json",
  "spy_snapshot.v0.json",
  "etf_benchmarks.v0.json",
  "website_content.v0.json",
  "home_feed.v0.json",
];

/** Not required for CI — published from admin; seed fixture until first publish. */
const OPTIONAL_BUNDLE_FILES = ["home_commentary.v0.json"];
const COMMENTARY_FIXTURE = path.join(root, "public", "fixtures", "home_commentary.v0.json");

function manifestUrl() {
  const explicit = process.env.NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL;
  if (explicit !== undefined && explicit.trim() === "") {
    return null;
  }
  if (process.env.STOCKTHEMES_USE_FIXTURES === "1") {
    return null;
  }
  const raw = explicit?.trim() || DEFAULT_MANIFEST;
  return normalizePublicJsonUrl(raw);
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

function seedHomeCommentaryFromFixture() {
  const rel = "home_commentary.v0.json";
  if (cacheFileOk(rel)) return;
  if (!fs.existsSync(COMMENTARY_FIXTURE)) {
    console.warn("sync-build-cache: no home_commentary.v0.json on bucket and no fixture to seed");
    return;
  }
  const dest = cachePath(rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(COMMENTARY_FIXTURE, dest);
  console.log(
    "sync-build-cache: home_commentary.v0.json not on bucket yet — using empty fixture (publish from admin when ready)",
  );
}

async function syncFactorProfileSidecars(manifestJson, base, objectMeta, { force = false } = {}) {
  const themeSlugs = (manifestJson.themes || []).map((t) => t?.slug).filter(Boolean);
  if (!themeSlugs.length) return;

  let ok = 0;
  let missing = 0;
  const concurrency = Math.max(1, Math.min(16, Number(process.env.STOCKTHEMES_SYNC_CONCURRENCY || 12)));
  await pool(themeSlugs, concurrency, async (slug) => {
    const rel = `themes/${slug}.factor_profile.v0.json`;
    if (!force && cacheFileOk(rel)) {
      ok += 1;
      return;
    }
    try {
      await fetchToCache(
        `${base}/themes/${encodeURIComponent(slug)}.factor_profile.v0.json`,
        rel,
        objectMeta,
      );
      ok += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("404")) {
        missing += 1;
        return;
      }
      console.warn(`sync-build-cache: factor profile ${rel} failed:`, msg);
    }
  });
  console.log(
    `sync-build-cache: factor profiles ok=${ok} missing=${missing} total=${themeSlugs.length}`,
  );
}

async function syncOptionalBundles(base, objectMeta, { force = false } = {}) {
  for (const rel of OPTIONAL_BUNDLE_FILES) {
    // Admin-published; always refresh in CI so Pages does not bake a stale cached copy.
    const alwaysRefresh =
      rel === "home_commentary.v0.json" && process.env.CI === "true";
    if (!force && !alwaysRefresh && cacheFileOk(rel)) continue;
    try {
      await fetchToCache(`${base}/${rel}`, rel, objectMeta);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("404")) {
        if (rel === "home_commentary.v0.json") seedHomeCommentaryFromFixture();
        continue;
      }
      console.warn(`sync-build-cache: optional ${rel} failed:`, msg);
      if (rel === "home_commentary.v0.json") seedHomeCommentaryFromFixture();
    }
  }
}

function themeSidecarBaseSlug(filename) {
  const m = String(filename || "").match(/^(.+)\.(factor_profile\.v0|chart\.v0)\.json$/);
  return m ? m[1] : null;
}

function pruneOrphanDetailFiles(manifestJson) {
  const themeSlugs = new Set(
    (manifestJson.themes || []).map((t) => String(t?.slug || "").trim()).filter(Boolean),
  );
  const groupSlugs = new Set(
    (manifestJson.groups || []).map((g) => String(g?.slug || "").trim()).filter(Boolean),
  );
  let removed = 0;
  const themesDir = cachePath("themes");
  if (fs.existsSync(themesDir)) {
    for (const file of fs.readdirSync(themesDir)) {
      if (!file.endsWith(".json")) continue;
      const sidecarSlug = themeSidecarBaseSlug(file);
      if (sidecarSlug) {
        if (!themeSlugs.has(sidecarSlug)) {
          fs.unlinkSync(path.join(themesDir, file));
          removed += 1;
        }
        continue;
      }
      if (!file.endsWith(".json")) continue;
      const slug = file.slice(0, -".json".length);
      if (slug.includes(".")) continue;
      if (!themeSlugs.has(slug)) {
        fs.unlinkSync(path.join(themesDir, file));
        removed += 1;
      }
    }
  }
  const groupsDir = cachePath("groups");
  if (fs.existsSync(groupsDir)) {
    for (const file of fs.readdirSync(groupsDir)) {
      if (!file.endsWith(".json")) continue;
      const slug = file.slice(0, -".json".length);
      if (slug.includes(".")) continue;
      if (!groupSlugs.has(slug)) {
        fs.unlinkSync(path.join(groupsDir, file));
        removed += 1;
      }
    }
  }
  if (removed > 0) {
    console.log(`sync-build-cache: pruned ${removed} orphan theme/group file(s)`);
  }
}

async function fetchLiveHomeTrendingAsOf(base) {
  try {
    if (gcsSyncEnabled()) {
      const raw = await downloadGcsObject("home_trending.v0.json");
      return String(JSON.parse(raw).as_of || "");
    }
    const res = await fetch(`${base}/home_trending.v0.json`, { cache: "no-store" });
    if (!res.ok) return "";
    return String((JSON.parse(await res.text())).as_of || "");
  } catch {
    return "";
  }
}

async function fetchToCache(url, rel, objectMeta) {
  const dest = cachePath(rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let text;

  if (gcsSyncEnabled()) {
    try {
      text = await downloadGcsObject(rel);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Manifest can list new groups before group JSON finishes uploading (ETL publishes manifest early).
      if (msg.includes("404") && url) {
        console.warn(`sync-build-cache: R2 404 for ${rel} — falling back to public CDN`);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${url} (after R2 404)`);
        }
        text = await res.text();
      } else {
        throw e;
      }
    }
  } else {
    const res = await fetch(url);
    if (!res.ok) {
      const sa = loadGcsServiceAccount();
      if (res.status === 403 && sa) {
        console.warn(`sync-build-cache: public URL 403 for ${rel} — falling back to authenticated R2`);
        text = await downloadGcsObject(rel);
      } else {
        throw new Error(`HTTP ${res.status} ${url}`);
      }
    } else {
      text = await res.text();
    }
  }

  fs.writeFileSync(dest, text, "utf8");

  try {
    const remoteMeta = await fetchRemoteObjectMetadata({ rel, url });
    if (remoteMeta) {
      recordObjectMeta(objectMeta, rel, remoteMeta);
    }
  } catch {
    /* metadata optional */
  }

  return text;
}

async function pool(items, concurrency, fn) {
  const queue = [...items];
  if (!queue.length) return;
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

  const base = publicDataBaseFromManifest(manifest);
  if (!base) {
    console.log("sync-build-cache: skip (invalid manifest URL)");
    return;
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });

  if (gcsSyncEnabled()) {
    console.log("sync-build-cache: using authenticated R2 (STOCKTHEMES_SYNC_VIA_R2=1)");
  } else {
    console.log("sync-build-cache: incremental checks via public R2 HEAD");
  }

  const objectMeta = readObjectMetaSidecar(OBJECT_META_PATH);
  const prev = readMeta();
  const force = process.env.STOCKTHEMES_BUILD_CACHE_REFRESH === "1";

  const manifestText = await fetchToCache(`${base}/manifest.json`, "manifest.json", objectMeta);
  const manifestJson = JSON.parse(manifestText);
  const asOf = String(manifestJson.as_of || "");
  const buildId = String(manifestJson.build_id || "");
  const slugFp = themeSlugFingerprint(manifestJson);
  const liveHomeTrendingAsOf = await fetchLiveHomeTrendingAsOf(base);
  const publishChanged = !prev || prev.as_of !== asOf || prev.manifestUrl !== manifest;
  const slugCatalogChanged = !prev || prev.theme_slug_fingerprint !== slugFp;
  const homeTrendingChanged =
    Boolean(liveHomeTrendingAsOf) &&
    String(prev?.home_trending_as_of || "") !== liveHomeTrendingAsOf;

  pruneOrphanDetailFiles(manifestJson);

  const allJobs = listWarmJobs(manifestJson, base);
  const themeCount = (manifestJson.themes || []).filter((t) => t?.slug).length;
  const missing = missingCacheRels(allJobs);
  const unchanged =
    !force &&
    prev &&
    prev.as_of === asOf &&
    prev.manifestUrl === manifest &&
    prev.theme_slug_fingerprint === slugFp &&
    !homeTrendingChanged &&
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
    await syncOptionalBundles(base, objectMeta);
    await syncFactorProfileSidecars(manifestJson, base, objectMeta);
  } else {
    if (!force && prev && prev.as_of === asOf && prev.manifestUrl === manifest && missing.length > 0) {
      console.warn(
        `sync-build-cache: as_of unchanged but ${missing.length} cached file(s) missing — filling gaps`,
      );
    }

    const { jobs, skipped, metaChecks } = await selectJobsToDownload({
      allJobs,
      force,
      publishChanged: force || publishChanged || slugCatalogChanged || homeTrendingChanged,
      objectMeta,
      cacheFileOk,
    });

    const detailJobs = jobs.filter((j) => isDetailJsonRel(j.rel));
    const bundleJobs = jobs.filter((j) => isBundleRel(j.rel));

    console.log(
      `sync-build-cache: download ${jobs.length}/${allJobs.length} objects ` +
        `(skipped_unchanged=${skipped} meta_checks=${metaChecks} ` +
        `themes=${detailJobs.filter((j) => j.rel.startsWith("themes/")).length} ` +
        `groups=${detailJobs.filter((j) => j.rel.startsWith("groups/")).length} ` +
        `bundles=${bundleJobs.length} publish_changed=${publishChanged} slug_fp_changed=${slugCatalogChanged})`,
    );

    const syncConcurrency = Math.max(
      1,
      Math.min(16, Number(process.env.STOCKTHEMES_SYNC_CONCURRENCY || 12)),
    );
    const failedJobs = [];
    let ok = 0;
    await pool(jobs, syncConcurrency, async (job) => {
      try {
        await fetchToCache(job.url, job.rel, objectMeta);
        ok += 1;
      } catch (e) {
        failedJobs.push({ job, err: e });
        console.warn(`sync-build-cache: failed ${job.rel}:`, e instanceof Error ? e.message : e);
      }
    });
    if (failedJobs.length > 0) {
      console.warn(`sync-build-cache: retrying ${failedJobs.length} failed object(s) (sequential)`);
      for (const { job, err: firstErr } of failedJobs) {
        try {
          await fetchToCache(job.url, job.rel, objectMeta);
          ok += 1;
          console.log(`sync-build-cache: retry ok ${job.rel}`);
        } catch (e) {
          console.warn(
            `sync-build-cache: retry failed ${job.rel}:`,
            e instanceof Error ? e.message : e,
          );
          if (firstErr !== e) {
            console.warn(`sync-build-cache: first error ${job.rel}:`, firstErr instanceof Error ? firstErr.message : firstErr);
          }
        }
      }
    }
    const fail = jobs.length - ok;
    console.log(`sync-build-cache: done ok=${ok} fail=${fail} skipped=${skipped}`);

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

    let homeTrendingAsOf = liveHomeTrendingAsOf;
    if (!homeTrendingAsOf) {
      try {
        const ht = JSON.parse(fs.readFileSync(cachePath("home_trending.v0.json"), "utf8"));
        homeTrendingAsOf = String(ht.as_of || "");
      } catch {
        /* optional */
      }
    }

    writeObjectMetaSidecar(OBJECT_META_PATH, objectMeta);
    writeMeta({
      as_of: asOf,
      build_id: buildId,
      manifestUrl: manifest,
      theme_slug_fingerprint: slugFp,
      home_trending_as_of: homeTrendingAsOf,
      warmedAt: new Date().toISOString(),
    });

    await syncOptionalBundles(base, objectMeta, { force });
    await syncFactorProfileSidecars(manifestJson, base, objectMeta, { force });
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
