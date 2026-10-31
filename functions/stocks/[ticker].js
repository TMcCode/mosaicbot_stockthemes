/**
 * On-demand stock pages (CF Pages 20k file cap — do not bake ~8k stock HTML).
 *
 * - Baked fixtures / allowlist: serve static asset when present.
 * - Long tail: one response = `__shell` HTML + injected ticker (no second navigation).
 */

const PUBLIC_DATA_BASE = "https://storage.stockthemes.ai";
const SITE_ORIGIN = "https://stockthemes.ai";

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clip(s, max = 158) {
  const t = String(s || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

async function loadPublicMeta(ticker) {
  const url = `${PUBLIC_DATA_BASE}/stocks/${encodeURIComponent(ticker)}.json`;
  try {
    const res = await fetch(url, {
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const raw = params?.ticker;
  const ticker = decodeURIComponent(String(Array.isArray(raw) ? raw[0] : raw || "").trim());

  if (!ticker || ticker === "__shell" || ticker.includes("..")) {
    return env.ASSETS.fetch(request);
  }

  // Prefer pre-baked HTML (fixtures / SYNC_STOCK_TICKERS allowlist).
  const asset = await env.ASSETS.fetch(request);
  if (asset.status !== 404) {
    return asset;
  }

  const shellUrl = new URL("/stocks/__shell", request.url);
  // Fetch shell + public meta in parallel (meta is SEO-only; don't block on failure).
  const [shellRes, detail] = await Promise.all([
    env.ASSETS.fetch(shellUrl),
    loadPublicMeta(ticker),
  ]);

  if (!shellRes.ok) {
    return new Response("Stock shell missing", { status: 500 });
  }

  const name =
    detail && typeof detail.name === "string" && detail.name.trim()
      ? detail.name.trim()
      : ticker;
  const title = `${name} (${ticker})`;
  const desc = clip(
    (detail && typeof detail.seo_intro === "string" && detail.seo_intro.trim()) ||
      `${name} (${ticker}) on stockthemes.ai.`,
  );
  const prettyPath = `/stocks/${encodeURIComponent(ticker)}`;
  const canonical = `${SITE_ORIGIN}${prettyPath}`;
  const shellPath = `/stocks/__shell?ticker=${encodeURIComponent(ticker)}`;

  let html = await shellRes.text();

  // Boot before Next hydrates: park on __shell so the static export matches, then
  // StockShellClient restoreState's the pretty URL after mount.
  const boot = `<script>
window.__STOCKTHEMES_ONDEMAND_TICKER__=${JSON.stringify(ticker)};
try{sessionStorage.setItem("st_ondemand_stock_ticker",${JSON.stringify(ticker)});}catch(e){}
try{history.replaceState(null,"",${JSON.stringify(shellPath)});}catch(e){}
</script>
<title>${escapeHtml(title)} · stockthemes.ai</title>
<meta name="description" content="${escapeHtml(desc)}"/>
<link rel="canonical" href="${escapeHtml(canonical)}"/>
<meta property="og:title" content="${escapeHtml(title)}"/>
<meta property="og:description" content="${escapeHtml(desc)}"/>
<meta property="og:url" content="${escapeHtml(canonical)}"/>
<meta property="og:site_name" content="stockthemes.ai"/>`;

  html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${boot}`);
  // Drop the generic shell <title> if still present after our inject (avoid duplicates).
  let seenTitle = 0;
  html = html.replace(/<title>[^<]*<\/title>/gi, (m) => {
    seenTitle += 1;
    return seenTitle === 1 ? m : "";
  });

  const headers = new Headers(shellRes.headers);
  headers.set("content-type", "text/html;charset=UTF-8");
  headers.set(
    "cache-control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  );
  headers.set("x-stockthemes-stock", "ondemand");
  headers.delete("content-length");

  return new Response(html, { status: 200, headers });
}

export async function onRequestHead(context) {
  const res = await onRequestGet(context);
  return new Response(null, { status: res.status, headers: res.headers });
}
