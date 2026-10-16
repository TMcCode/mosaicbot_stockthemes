/**
 * Tiny proxy so stockthemes CI can read Alt Data Observer without Substack
 * blocking GitHub Actions IPs.
 */
const DEFAULT_UPSTREAM =
  "https://altadataobserver.substack.com/api/v1/archive?sort=new&limit=20";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export default {
  async fetch(_request, env) {
    const upstream = String(env.UPSTREAM_ARCHIVE || DEFAULT_UPSTREAM).trim() || DEFAULT_UPSTREAM;
    const res = await fetch(upstream, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": UA,
      },
    });
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json; charset=utf-8",
        "cache-control": "public, max-age=300",
        "access-control-allow-origin": "*",
      },
    });
  },
};
