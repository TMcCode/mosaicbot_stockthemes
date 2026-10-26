/**
 * Optional Cloudflare Worker for stockthemes-public on R2.
 *
 * Preferred browser path for Tier B is same-origin Pages Function:
 *   https://stockthemes.ai/cdn-app/themes/<slug>.app.v0.json
 * (private objects under r2://mosaic-themes/stockthemes_app/…).
 *
 * This Worker remains useful if you route data.stockthemes.ai → R2 binding for
 * Tier A (SEO) JSON only. Protected suffixes are refused without an allowlisted
 * Origin/Referer and are rate-limited.
 */
const ALLOWED_ORIGINS = new Set([
  "https://stockthemes.ai",
  "https://www.stockthemes.ai",
  "https://stockcontext.info",
  "https://www.stockcontext.info",
  "https://tmccode.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3002",
]);

const PROTECTED_SUFFIXES = [
  ".app.v0.json",
  ".notes.v0.json",
  ".price_returns.v0.json",
  ".factor_profile.v0.json",
  ".factor_attribution.v0.json",
  ".revenue.v0.json",
  ".quality_risk.v0.json",
  ".composition.v0.json",
  ".chart.v0.json",
  ".correlation_bundle.v0.json",
  ".stock_correlations.v0.json",
  ".theme_neighbors.v0.json",
];

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const rateHits = new Map();

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "ETag, Content-Length, Content-Type",
    Vary: "Origin",
  };
}

function cacheControlFor(path) {
  if (path === "manifest.json") return "public, max-age=60, s-maxage=300";
  return "public, max-age=300, s-maxage=3600";
}

function isProtected(key) {
  const lower = key.toLowerCase();
  return PROTECTED_SUFFIXES.some((s) => lower.endsWith(s));
}

function originAllowed(request) {
  const origin = request.headers.get("Origin") || "";
  if (origin && ALLOWED_ORIGINS.has(origin)) return true;
  const referer = request.headers.get("Referer") || "";
  if (referer) {
    try {
      const o = new URL(referer).origin;
      if (ALLOWED_ORIGINS.has(o)) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

function allowRate(ip) {
  const now = Date.now();
  let row = rateHits.get(ip);
  if (!row || now - row.start > RATE_LIMIT_WINDOW_MS) {
    row = { start: now, count: 0 };
    rateHits.set(ip, row);
  }
  row.count += 1;
  return row.count <= RATE_LIMIT_MAX;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/+/, "");
    if (!key || key.includes("..")) {
      return new Response("Not found", { status: 404, headers: corsHeaders(request) });
    }

    if (isProtected(key)) {
      if (!originAllowed(request)) {
        return new Response("Forbidden", { status: 403, headers: corsHeaders(request) });
      }
      const ip =
        request.headers.get("CF-Connecting-IP") ||
        request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
        "unknown";
      if (!allowRate(ip)) {
        return new Response("Too Many Requests", {
          status: 429,
          headers: { "Retry-After": "60", ...corsHeaders(request) },
        });
      }
    }

    if (!env.STOCKTHEMES_PUBLIC) {
      return new Response("R2 binding STOCKTHEMES_PUBLIC is not configured", { status: 500 });
    }

    const object = await env.STOCKTHEMES_PUBLIC.get(key, {
      onlyIf: request.headers,
    });
    if (object === null) {
      return new Response("Not found", { status: 404, headers: corsHeaders(request) });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", headers.get("cache-control") || cacheControlFor(key));
    for (const [k, v] of Object.entries(corsHeaders(request))) {
      headers.set(k, v);
    }

    return new Response(request.method === "HEAD" ? null : object.body, {
      status: 200,
      headers,
    });
  },
};
