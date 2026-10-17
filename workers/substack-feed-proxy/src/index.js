/**
 * Tiny proxy so stockthemes CI can read Alt Data Observer without Substack
 * blocking GitHub Actions IPs.
 *
 * On upstream success: cache for 5 minutes.
 * On upstream failure (403/429/…): serve last-good cached body if present
 * (so scheduled bakes stay green), otherwise pass through status with no-store
 * so error responses are never cached at the edge.
 */
const DEFAULT_UPSTREAM =
  "https://altadataobserver.substack.com/api/v1/archive?sort=new&limit=20";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const CACHE_KEY = new Request(
  "https://stockthemes-substack-feed-proxy.internal/v1/archive",
);

export default {
  async fetch(_request, env, ctx) {
    const upstream =
      String(env.UPSTREAM_ARCHIVE || DEFAULT_UPSTREAM).trim() || DEFAULT_UPSTREAM;
    const cache = caches.default;

    let upstreamRes;
    try {
      upstreamRes = await fetch(upstream, {
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": UA,
        },
      });
    } catch (err) {
      const cached = await cache.match(CACHE_KEY);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set("x-proxy-cache", "STALE-FETCH-ERROR");
        headers.set("access-control-allow-origin", "*");
        return new Response(cached.body, { status: 200, headers });
      }
      return new Response(
        JSON.stringify({
          error: "upstream_fetch_failed",
          detail: String(err?.message || err),
        }),
        {
          status: 502,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
          },
        },
      );
    }

    const body = await upstreamRes.arrayBuffer();
    if (upstreamRes.ok) {
      const out = new Response(body, {
        status: 200,
        headers: {
          "content-type":
            upstreamRes.headers.get("content-type") ||
            "application/json; charset=utf-8",
          "cache-control": "public, max-age=300",
          "access-control-allow-origin": "*",
          "x-proxy-cache": "MISS",
        },
      });
      ctx.waitUntil(cache.put(CACHE_KEY, out.clone()));
      return out;
    }

    const cached = await cache.match(CACHE_KEY);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("x-proxy-cache", `STALE-UPSTREAM-${upstreamRes.status}`);
      headers.set("access-control-allow-origin", "*");
      return new Response(cached.body, { status: 200, headers });
    }

    return new Response(body, {
      status: upstreamRes.status,
      headers: {
        "content-type":
          upstreamRes.headers.get("content-type") ||
          "application/json; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
        "x-proxy-cache": "NONE",
      },
    });
  },
};
