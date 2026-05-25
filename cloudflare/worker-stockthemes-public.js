/**
 * Optional Cloudflare Worker for stockthemes-public on R2.
 *
 * Preferred production path is the R2 custom domain:
 *   https://storage.stockthemes.ai/*
 *
 * If a Worker route is still useful, bind the R2 bucket as STOCKTHEMES_PUBLIC
 * and route a hostname to this script.
 */
const ALLOWED_ORIGINS = new Set([
  "https://stockthemes.ai",
  "https://www.stockthemes.ai",
  "https://tmccode.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

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
