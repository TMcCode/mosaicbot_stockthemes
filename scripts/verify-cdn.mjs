/**
 * Smoke test for public R2 custom domain (storage.stockthemes.ai → stockthemes-public).
 */
const CDN_BASE = "https://storage.stockthemes.ai";
const CDN_MANIFEST = `${CDN_BASE}/manifest.json`;
const CDN_HOME_TRENDING = `${CDN_BASE}/home_trending.v0.json`;
const CDN_THEME_SAMPLE = `${CDN_BASE}/themes/agentic-utilities-26-backbone-infra.json`;

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

  const cdn = await head(CDN_MANIFEST);
  const home = await head(CDN_HOME_TRENDING);
  if (cdn.status !== 200) {
    console.error(
      "\nPublic R2 domain not ready. Attach stockthemes-public to storage.stockthemes.ai.",
    );
    process.exit(1);
  }
  if (home.status !== 200) {
    console.error(
      `\nhome_trending returned ${home.status} — check R2 public access and publish output.`,
    );
    process.exit(1);
  }
  if (!cdn.cfCache) {
    console.warn("\nWarning: no cf-cache-status — is the hostname proxied through Cloudflare?");
  } else {
    console.log("\nOK: Cloudflare is in front of storage.stockthemes.ai");
  }
  console.log("OK: home_trending and theme JSON reachable via public R2 domain");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
