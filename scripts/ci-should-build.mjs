/**
 * GitHub Actions: decide Pages build + whether to purge/re-download full public JSON cache.
 *
 * Outputs (GITHUB_OUTPUT):
 *   should_build — run static export + deploy
 *   full_cache_refresh — purge themes/groups and force full re-download (manual / force only)
 *   reason — log string
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { publicDataBaseFromManifest } from "./lib/publicDataBase.mjs";
import { downloadR2Object, r2SyncEnabled } from "./lib/r2Download.mjs";
import { STOCKTHEMES_PUBLIC_MANIFEST_URL } from "./lib/storageConfig.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const DEPLOY_META = path.join(root, ".cache", "stockthemes-public", "_pages_deploy_meta.json");

const MANIFEST_URL =
  process.env.MANIFEST_URL?.trim() ||
  process.env.NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL?.trim() ||
  STOCKTHEMES_PUBLIC_MANIFEST_URL;

function writeOutputs({ shouldBuild, fullCacheRefresh, reason }) {
  const out = process.env.GITHUB_OUTPUT;
  const line = (k, v) => `${k}=${v}\n`;
  if (out) {
    fs.appendFileSync(out, line("should_build", shouldBuild ? "true" : "false"));
    fs.appendFileSync(out, line("full_cache_refresh", fullCacheRefresh ? "true" : "false"));
    fs.appendFileSync(out, line("reason", reason.replace(/\n/g, " ")));
  }
  console.log(
    `ci-should-build: should_build=${shouldBuild} full_cache_refresh=${fullCacheRefresh} (${reason})`,
  );
}

function readDeployedMeta() {
  try {
    return JSON.parse(fs.readFileSync(DEPLOY_META, "utf8"));
  } catch {
    return {};
  }
}

async function fetchJsonAsOf(url, label) {
  if (r2SyncEnabled()) {
    const objectPath = label === "manifest" ? "manifest.json" : `${label}.v0.json`;
    const data = JSON.parse(await downloadR2Object(objectPath));
    return String(data.as_of || "");
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`${label} HTTP ${res.status} from ${url}`);
  }
  const data = JSON.parse(await res.text());
  return String(data.as_of || "");
}

async function fetchLivePublishAsOf() {
  const manifestAsOf = await fetchJsonAsOf(MANIFEST_URL, "manifest");
  const base = publicDataBaseFromManifest(MANIFEST_URL);
  let homeTrendingAsOf = "";
  if (base) {
    try {
      homeTrendingAsOf = await fetchJsonAsOf(`${base}/home_trending.v0.json`, "home_trending");
    } catch (e) {
      console.warn(`ci-should-build: home_trending fetch failed (${e?.message || e})`);
    }
  }
  return { manifestAsOf, homeTrendingAsOf };
}

function publishDataChanged(live, deployed) {
  if (!deployed.manifestAsOf && !deployed.homeTrendingAsOf) {
    return true;
  }
  if (live.manifestAsOf && live.manifestAsOf !== deployed.manifestAsOf) {
    return true;
  }
  if (live.homeTrendingAsOf && live.homeTrendingAsOf !== deployed.homeTrendingAsOf) {
    return true;
  }
  return false;
}

async function main() {
  const event = process.env.GITHUB_EVENT_NAME || "";
  const forceBuild = process.env.FORCE_BUILD === "true" || process.env.FORCE_BUILD === "1";
  const manualRefresh =
    process.env.REFRESH_CACHE === "true" || process.env.REFRESH_CACHE === "1";

  const deployedRaw = readDeployedMeta();
  const deployed = {
    manifestAsOf: String(deployedRaw.as_of || ""),
    homeTrendingAsOf: String(deployedRaw.home_trending_as_of || ""),
  };

  const live = await fetchLivePublishAsOf();
  const dataChanged = publishDataChanged(live, deployed);
  // Routine manifest bumps use incremental md5/ETag sync — avoid purging 800+ theme files.
  const fullCacheRefresh = manualRefresh || forceBuild;

  if (forceBuild) {
    writeOutputs({
      shouldBuild: true,
      fullCacheRefresh: true,
      reason: "force_build",
    });
    return;
  }

  if (manualRefresh) {
    writeOutputs({
      shouldBuild: true,
      fullCacheRefresh: true,
      reason: "manual_refresh_cache",
    });
    return;
  }

  if (event === "push") {
    writeOutputs({
      shouldBuild: true,
      fullCacheRefresh,
      reason: dataChanged
        ? `push_to_main data_changed manifest=${live.manifestAsOf}`
        : "push_to_main reuse_cache",
    });
    return;
  }

  if (event === "workflow_dispatch") {
    writeOutputs({
      shouldBuild: true,
      fullCacheRefresh,
      reason: dataChanged ? "manual_dispatch data_changed" : "manual_dispatch reuse_cache",
    });
    return;
  }

  if (event !== "schedule") {
    writeOutputs({
      shouldBuild: true,
      fullCacheRefresh,
      reason: `event_${event || "unknown"}`,
    });
    return;
  }

  if (!deployed.manifestAsOf && !deployed.homeTrendingAsOf) {
    writeOutputs({
      shouldBuild: true,
      fullCacheRefresh: true,
      reason: `no_prior_deploy_meta manifest=${live.manifestAsOf}`,
    });
    return;
  }

  if (!dataChanged) {
    writeOutputs({
      shouldBuild: false,
      fullCacheRefresh: false,
      reason: `publish_unchanged manifest=${live.manifestAsOf}`,
    });
    return;
  }

  writeOutputs({
    shouldBuild: true,
    fullCacheRefresh: false,
    reason: `publish_changed manifest ${deployed.manifestAsOf} -> ${live.manifestAsOf}`,
  });
}

main().catch((e) => {
  console.error(e);
  writeOutputs({
    shouldBuild: true,
    fullCacheRefresh: true,
    reason: "check_failed_default_build",
  });
  process.exit(0);
});
