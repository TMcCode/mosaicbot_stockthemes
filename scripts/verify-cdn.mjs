/**
 * Smoke test for Path A CDN (data.stockthemes.ai → stockthemes-public).
 */
const CDN_BASE = "https://data.stockthemes.ai";
const CDN_MANIFEST = `${CDN_BASE}/manifest.json`;
const CDN_HOME_TRENDING = `${CDN_BASE}/home_trending.v0.json`;
const CDN_THEME_SAMPLE = `${CDN_BASE}/themes/agentic-utilities-26-backbone-infra.json`;
const CDN_DIAG = `${CDN_BASE}/_cdn_diag`;
const GCS_MANIFEST =
  "https://storage.googleapis.com/stockthemes-public/manifest.json";

async function head(url) {
  const res = await fetch(url, { method: "HEAD" });
  return {
    url,
    status: res.status,
    cacheControl: res.headers.get("cache-control") || "",
    cfCache: res.headers.get("cf-cache-status") || "",
  };
}

async function main() {
  console.log("CDN manifest:", await head(CDN_MANIFEST));
  console.log("CDN manifest (2nd — expect HIT):", await head(CDN_MANIFEST));
  console.log("CDN home_trending:", await head(CDN_HOME_TRENDING));
  console.log("CDN theme sample:", await head(CDN_THEME_SAMPLE));
  console.log("GCS manifest (direct — expect 403 if bucket private):", await head(GCS_MANIFEST));

  try {
    const diagRes = await fetch(CDN_DIAG);
    if (diagRes.status === 404) {
      console.warn(
        "\n_cdn_diag not found — redeploy worker from cloudflare/worker-stockthemes-public.js",
      );
    } else {
      const diag = await diagRes.json();
      console.log("\nWorker auth diag (_cdn_diag):", diag);
      if (diag.tokenStatus !== "ok") {
        console.error(
          "\nWorker is not getting a GCS token. Fix GCP_SA_* secrets and redeploy.",
        );
      }
    }
  } catch (e) {
    console.warn("\n_cdn_diag fetch failed:", e.message);
  }

  const cdn = await head(CDN_MANIFEST);
  const home = await head(CDN_HOME_TRENDING);
  if (cdn.status !== 200) {
    console.error(
      "\nCDN not ready. Deploy cloudflare/worker-stockthemes-public.js and route data.stockthemes.ai/*",
    );
    process.exit(1);
  }
  if (home.status !== 200) {
    console.error(
      `\nhome_trending returned ${home.status} — private bucket needs working Worker SA auth.`,
    );
    process.exit(1);
  }
  if (!cdn.cfCache) {
    console.warn("\nWarning: no cf-cache-status — is the hostname proxied through Cloudflare?");
  } else {
    console.log("\nOK: Cloudflare is in front of data.stockthemes.ai");
  }
  console.log("OK: home_trending and theme JSON reachable via CDN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
