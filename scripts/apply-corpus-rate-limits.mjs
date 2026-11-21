#!/usr/bin/env node
/**
 * Apply stockthemes corpus scrape rate-limit rule (http_ratelimit phase).
 *
 * Free/Pro zone plans often allow only **1** rate-limit rule and period **10s**.
 * This script upserts a single combined expression covering:
 *   - /cdn-app/*
 *   - storage harvest bundles + themes/*.json crawl
 *
 * Intentionally does **not** rate-limit apex `/themes/*` HTML — Next prefetch +
 * normal browsing blew past 30/10s and 1015'd real users.
 *
 *   CLOUDFLARE_WAF_API_TOKEN=… CLOUDFLARE_ZONE_ID=… npm run apply:corpus-rate-limits
 *
 * See docs/CORPUS_SCRAPE_HARDENING.md.
 */

const ZONE_ID = (process.env.CLOUDFLARE_ZONE_ID || "").trim();
const TOKEN = (
  process.env.CLOUDFLARE_WAF_API_TOKEN ||
  process.env.CLOUDFLARE_API_TOKEN ||
  ""
).trim();

if (!ZONE_ID || !TOKEN) {
  console.error(
    "Need CLOUDFLARE_ZONE_ID and CLOUDFLARE_WAF_API_TOKEN (or CLOUDFLARE_API_TOKEN with WAF Edit).",
  );
  process.exit(1);
}

const API = "https://api.cloudflare.com/client/v4";

const COMBINED = {
  description: "stockthemes corpus scrape guard",
  // JSON / Tier B only — not HTML. Busy theme pages can easily exceed 30/10s.
  expression: [
    '(starts_with(http.request.uri.path, "/cdn-app/")',
    'or (http.host eq "storage.stockthemes.ai" and (',
    'http.request.uri.path eq "/compare_themes.v0.json"',
    'or http.request.uri.path eq "/search_index.v0.json"',
    'or http.request.uri.path eq "/manifest.json"',
    'or http.request.uri.path eq "/home_feed.v0.json"',
    'or http.request.uri.path eq "/radar_news.v0.json"',
    'or (starts_with(http.request.uri.path, "/themes/") and ends_with(http.request.uri.path, ".json"))',
    "))",
    ")",
  ].join(" "),
  // Challenge humans who burst; scrapers still pay. Prefer over hard block.
  action: "managed_challenge",
  enabled: true,
  // Plan constraint: period must be 10 on many non-Enterprise zones.
  // ~120/10s ≈ 12/s — room for signed-in desk sidecars + prefetch; still slows corpus scrapes.
  ratelimit: {
    characteristics: ["ip.src", "cf.colo.id"],
    period: 10,
    requests_per_period: 120,
    mitigation_timeout: 10,
    requests_to_origin: false,
  },
};

async function cf(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) {
    const err = data.errors?.[0];
    throw new Error(
      `${method} ${path} → ${res.status}: ${err?.message || JSON.stringify(data.errors)}`,
    );
  }
  return data.result;
}

async function ensureEntrypoint() {
  try {
    return await cf(`/zones/${ZONE_ID}/rulesets/phases/http_ratelimit/entrypoint`);
  } catch (e) {
    if (!String(e.message).includes("404")) throw e;
    console.log("Creating http_ratelimit entrypoint ruleset…");
    return await cf(`/zones/${ZONE_ID}/rulesets`, {
      method: "POST",
      body: {
        name: "default",
        kind: "zone",
        phase: "http_ratelimit",
        rules: [],
      },
    });
  }
}

async function main() {
  const entry = await ensureEntrypoint();
  const rulesetId = entry.id;
  const existing = entry.rules || [];
  console.log(`Zone ${ZONE_ID} ruleset ${rulesetId} (${existing.length} existing rule(s))`);

  const prev =
    existing.find((r) => r.description === COMBINED.description) ||
    existing.find((r) => /cdn-app|corpus scrape/i.test(r.description || "")) ||
    existing[0];

  if (prev?.id) {
    console.log(`Updating rule ${prev.id} (${prev.description})`);
    await cf(`/zones/${ZONE_ID}/rulesets/${rulesetId}/rules/${prev.id}`, {
      method: "PATCH",
      body: COMBINED,
    });
  } else {
    console.log("Creating combined corpus scrape rule");
    await cf(`/zones/${ZONE_ID}/rulesets/${rulesetId}/rules`, {
      method: "POST",
      body: COMBINED,
    });
  }

  const after = await cf(`/zones/${ZONE_ID}/rulesets/phases/http_ratelimit/entrypoint`);
  console.log("Done. Active rate-limit rules:");
  for (const r of after.rules || []) {
    console.log(
      `  - ${r.description} (${r.action}, ${r.ratelimit?.requests_per_period}/${r.ratelimit?.period}s, enabled=${r.enabled})`,
    );
    console.log(`    ${r.expression}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  if (/Authentication error|403|10000/i.test(String(err.message))) {
    console.error(
      "\nToken lacks Zone WAF Edit. Create CLOUDFLARE_WAF_API_TOKEN in the dashboard\n" +
        "(Specified Domains → stockthemes.ai → Zone WAF Rules Edit) and re-run.",
    );
  }
  process.exit(1);
});
