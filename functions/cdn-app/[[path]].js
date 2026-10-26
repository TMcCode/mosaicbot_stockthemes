/**
 * Same-origin Tier B proxy: /cdn-app/themes/<slug>.app.v0.json → private R2.
 *
 * Objects live at r2://mosaic-themes/stockthemes_app/<path> (not on the public CDN).
 * Browsers must call this from stockthemes.ai; bare curl / off-site scrape gets 403.
 * CI/build reads the private bucket via R2 API credentials (sync-build-cache).
 */

const ALLOWED_HOST_SUFFIXES = ["stockthemes.ai", "localhost", "127.0.0.1"];

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

const PRIVATE_PREFIX = "stockthemes_app/";

/** Soft rate limit per isolate (best-effort; pair with CF Rate Limiting in dashboard). */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 90;
const rateHits = new Map();

function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function allowRate(ip) {
  const now = Date.now();
  let row = rateHits.get(ip);
  if (!row || now - row.start > RATE_LIMIT_WINDOW_MS) {
    row = { start: now, count: 0 };
    rateHits.set(ip, row);
  }
  row.count += 1;
  if (rateHits.size > 5000) {
    for (const [k, v] of rateHits) {
      if (now - v.start > RATE_LIMIT_WINDOW_MS) rateHits.delete(k);
    }
  }
  return row.count <= RATE_LIMIT_MAX;
}

function hostAllowed(raw) {
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(
      (s) => host === s || host.endsWith(`.${s}`),
    );
  } catch {
    return false;
  }
}

function requestAllowed(request) {
  const origin = request.headers.get("Origin") || "";
  if (origin && hostAllowed(origin)) return true;
  const referer = request.headers.get("Referer") || "";
  if (referer && hostAllowed(referer)) return true;
  // Same-origin navigations / no-cors edge cases on first party.
  const site = (request.headers.get("Sec-Fetch-Site") || "").toLowerCase();
  if (site === "same-origin" || site === "same-site") return true;
  return false;
}

function isProtectedKey(key) {
  const lower = key.toLowerCase();
  return PROTECTED_SUFFIXES.some((s) => lower.endsWith(s));
}

function joinPath(params) {
  const raw = params?.path;
  if (Array.isArray(raw)) return raw.map(decodeURIComponent).join("/");
  if (typeof raw === "string" && raw) return decodeURIComponent(raw);
  return "";
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const key = joinPath(params).replace(/^\/+/, "");

  if (!key || key.includes("..") || !isProtectedKey(key)) {
    return new Response("Not found", { status: 404 });
  }

  if (!requestAllowed(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  const ip = clientIp(request);
  if (!allowRate(ip)) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  if (!env.MOSAIC_THEMES) {
    return new Response("R2 binding MOSAIC_THEMES is not configured", { status: 500 });
  }

  const objectKey = `${PRIVATE_PREFIX}${key}`;
  const object = await env.MOSAIC_THEMES.get(objectKey);
  if (object === null) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set(
    "cache-control",
    "private, max-age=60, s-maxage=300, stale-while-revalidate=600",
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Vary", "Origin, Referer");

  return new Response(object.body, { status: 200, headers });
}

export async function onRequestHead(context) {
  const res = await onRequestGet(context);
  return new Response(null, { status: res.status, headers: res.headers });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
