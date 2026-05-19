/**
 * Smoke test for Path A CDN (data.stockthemes.ai → stockthemes-public).
 */
const CDN_MANIFEST = "https://data.stockthemes.ai/manifest.json";
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
  console.log("GCS manifest (direct — should still work):", await head(GCS_MANIFEST));

  const cdn = await head(CDN_MANIFEST);
  if (cdn.status !== 200) {
    console.error(
      "\nCDN not ready. Deploy cloudflare/worker-stockthemes-public.js and route data.stockthemes.ai/*",
    );
    process.exit(1);
  }
  if (!cdn.cfCache) {
    console.warn("\nWarning: no cf-cache-status — is the hostname proxied through Cloudflare?");
  } else {
    console.log("\nOK: Cloudflare is in front of data.stockthemes.ai");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
