/**
 * Smoke-check Pages Function `/cdn-app` gate for theme + stock Tier B sidecars.
 *
 * Env:
 *   STOCKTHEMES_SITE_ORIGIN  (default https://stockthemes.ai)
 *   STOCKTHEMES_TIER_B_THEME (default agentic-utilities-26-backbone-infra)
 *   STOCKTHEMES_TIER_B_TICKER (default AAPL)
 *   STOCKTHEMES_ENFORCE_TIER_B=1 → exit 1 on failures
 */
const ORIGIN = (process.env.STOCKTHEMES_SITE_ORIGIN || "https://stockthemes.ai").replace(
  /\/$/,
  "",
);
const THEME = process.env.STOCKTHEMES_TIER_B_THEME || "agentic-utilities-26-backbone-infra";
const TICKER = process.env.STOCKTHEMES_TIER_B_TICKER || "AAPL";
const enforce = process.env.STOCKTHEMES_ENFORCE_TIER_B === "1";
const PUBLIC_CDN = "https://storage.stockthemes.ai";

async function head(url, headers = {}) {
  const res = await fetch(url, { method: "HEAD", headers, redirect: "manual" });
  return { url, status: res.status };
}

function pathOk(status, expect) {
  if (expect === "deny") return status === 403 || status === 401;
  if (expect === "allow") return status === 200 || status === 404;
  if (expect === "missing_public") return status === 404 || status === 403;
  return false;
}

async function main() {
  const checks = [
    {
      label: "anon theme price_returns",
      expect: "deny",
      run: () => head(`${ORIGIN}/cdn-app/themes/${encodeURIComponent(THEME)}.price_returns.v0.json`),
    },
    {
      label: "origin theme price_returns",
      expect: "allow",
      run: () =>
        head(`${ORIGIN}/cdn-app/themes/${encodeURIComponent(THEME)}.price_returns.v0.json`, {
          Origin: ORIGIN,
        }),
    },
    {
      label: "anon stock app",
      expect: "deny",
      run: () => head(`${ORIGIN}/cdn-app/stocks/${encodeURIComponent(TICKER)}.app.v0.json`),
    },
    {
      label: "anon stock price_returns",
      expect: "deny",
      run: () =>
        head(`${ORIGIN}/cdn-app/stocks/${encodeURIComponent(TICKER)}.price_returns.v0.json`),
    },
    {
      label: "origin stock app",
      expect: "allow",
      run: () =>
        head(`${ORIGIN}/cdn-app/stocks/${encodeURIComponent(TICKER)}.app.v0.json`, {
          Origin: ORIGIN,
        }),
    },
    {
      label: "origin stock price_returns",
      expect: "allow",
      run: () =>
        head(`${ORIGIN}/cdn-app/stocks/${encodeURIComponent(TICKER)}.price_returns.v0.json`, {
          Origin: ORIGIN,
        }),
    },
    {
      label: "public CDN stock price_returns (should not be world-readable)",
      expect: "missing_public",
      run: () =>
        head(`${PUBLIC_CDN}/stocks/${encodeURIComponent(TICKER)}.price_returns.v0.json`),
    },
  ];

  const failures = [];
  for (const c of checks) {
    const result = await c.run();
    const ok = pathOk(result.status, c.expect);
    console.log(
      `verify-tier-b: ${c.label} → HTTP ${result.status} (${c.expect}) ${ok ? "OK" : "FAIL"}`,
    );
    if (!ok) failures.push(`${c.label}: status=${result.status} expect=${c.expect}`);
  }

  if (failures.length && enforce) {
    console.error(`verify-tier-b: failed\n${failures.join("\n")}`);
    process.exit(1);
  }
  if (failures.length) {
    console.warn("verify-tier-b: report-only failures (set STOCKTHEMES_ENFORCE_TIER_B=1 to enforce)");
    if (process.env.GITHUB_ACTIONS) {
      for (const f of failures) console.log(`::warning title=Tier B gate::${f}`);
    }
  } else {
    console.log("verify-tier-b: all checks passed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
