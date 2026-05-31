/**
 * Per-object metadata for incremental sync-build-cache (skip unchanged theme/group JSON).
 */
import crypto from "crypto";
import fs from "fs";

import { gcsObjectMetadata, gcsSyncEnabled } from "./gcsDownload.mjs";

const BUNDLE_RELS = new Set([
  "manifest.json",
  "search_index.v0.json",
  "home_trending.v0.json",
  "home_top_movers.v0.json",
  "compare_themes.v0.json",
  "spy_snapshot.v0.json",
  "etf_benchmarks.v0.json",
  "website_content.v0.json",
  "home_feed.v0.json",
  "home_commentary.v0.json",
]);

export function isDetailJsonRel(rel) {
  return rel.startsWith("themes/") || rel.startsWith("groups/");
}

export function isBundleRel(rel) {
  return BUNDLE_RELS.has(rel);
}

/** Stable hash of theme slug list — detect catalog membership changes. */
export function themeSlugFingerprint(manifestJson) {
  const slugs = (manifestJson?.themes || [])
    .map((t) => String(t?.slug || "").trim())
    .filter(Boolean)
    .sort();
  return crypto.createHash("sha256").update(slugs.join("\n")).digest("hex").slice(0, 16);
}

/** Slugs called out in manifest new/updated events (content may have changed). */
export function priorityThemeSlugsFromManifest(manifestJson) {
  const themeByName = new Map(
    (manifestJson?.themes || [])
      .map((t) => [String(t?.name || "").trim(), String(t?.slug || "").trim()])
      .filter(([name, slug]) => name && slug),
  );
  const slugs = new Set();
  for (const e of manifestJson?.new_theme_events || []) {
    const s = themeByName.get(String(e?.name || "").trim());
    if (s) slugs.add(s);
  }
  for (const e of manifestJson?.updated_theme_events || []) {
    const s = themeByName.get(String(e?.name || "").trim());
    if (s) slugs.add(s);
  }
  for (const name of manifestJson?.new_themes || []) {
    const s = themeByName.get(String(name || "").trim());
    if (s) slugs.add(s);
  }
  for (const name of manifestJson?.updated_themes || []) {
    const s = themeByName.get(String(name || "").trim());
    if (s) slugs.add(s);
  }
  return slugs;
}

export function trendingSlugsFromHomeTrending(homeTrendingJson) {
  const slugs = new Set();
  for (const row of homeTrendingJson?.rows || []) {
    const s = String(row?.slug || "").trim();
    if (s) slugs.add(s);
  }
  return slugs;
}

export function readObjectMetaSidecar(metaPath) {
  try {
    const raw = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function writeObjectMetaSidecar(metaPath, objectMeta) {
  fs.writeFileSync(metaPath, JSON.stringify(objectMeta, null, 2), "utf8");
}

export function remoteMetaMatchesCached(rel, remoteMeta, objectMeta) {
  const local = objectMeta[rel];
  if (!local) {
    return false;
  }
  if (remoteMeta?.md5Hash && local.md5Hash) {
    return remoteMeta.md5Hash === local.md5Hash;
  }
  if (remoteMeta?.generation && local.generation) {
    return remoteMeta.generation === local.generation;
  }
  if (remoteMeta?.etag && local.etag) {
    return remoteMeta.etag === local.etag;
  }
  if (remoteMeta?.lastModified && local.lastModified) {
    return remoteMeta.lastModified === local.lastModified;
  }
  return false;
}

export function recordObjectMeta(objectMeta, rel, remoteMeta, extra = {}) {
  objectMeta[rel] = {
    md5Hash: remoteMeta?.md5Hash,
    generation: remoteMeta?.generation,
    updated: remoteMeta?.updated,
    etag: remoteMeta?.etag,
    lastModified: remoteMeta?.lastModified,
    ...extra,
    syncedAt: new Date().toISOString(),
  };
}

/** @param {string} url */
export async function fetchCdnObjectMetadata(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) {
      return null;
    }
    const etag = (res.headers.get("etag") || "").replace(/^"|"$/g, "");
    return {
      etag: etag || undefined,
      lastModified: res.headers.get("last-modified") || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * @param {{ rel: string, url: string }} job
 */
export async function fetchRemoteObjectMetadata(job) {
  if (gcsSyncEnabled()) {
    return gcsObjectMetadata(job.rel);
  }
  return fetchCdnObjectMetadata(job.url);
}

async function poolMap(items, concurrency, fn) {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Decide which jobs need a full download.
 * @param {object} opts
 */
export async function selectJobsToDownload({
  allJobs,
  force,
  publishChanged,
  objectMeta,
  cacheFileOk,
}) {
  if (force) {
    return { jobs: allJobs, skipped: 0, metaChecks: 0 };
  }

  const jobs = [];
  let skipped = 0;

  for (const job of allJobs) {
    if (!cacheFileOk(job.rel)) {
      jobs.push(job);
      continue;
    }

    if (isBundleRel(job.rel)) {
      if (publishChanged) {
        jobs.push(job);
      } else {
        skipped += 1;
      }
      continue;
    }

    if (!isDetailJsonRel(job.rel)) {
      jobs.push(job);
    }
  }

  const detailCached = allJobs.filter(
    (job) => cacheFileOk(job.rel) && isDetailJsonRel(job.rel),
  );
  const metaChecks = detailCached.length;

  if (metaChecks > 0) {
    const decisions = await poolMap(detailCached, 20, async (job) => {
      try {
        const remoteMeta = await fetchRemoteObjectMetadata(job);
        if (!remoteMeta) {
          return { job, fetch: true };
        }
        if (remoteMetaMatchesCached(job.rel, remoteMeta, objectMeta)) {
          return { job, fetch: false };
        }
        return { job, fetch: true };
      } catch {
        return { job, fetch: true };
      }
    });

    for (const d of decisions) {
      if (d.fetch) {
        jobs.push(d.job);
      } else {
        skipped += 1;
      }
    }
  }

  return { jobs, skipped, metaChecks };
}
