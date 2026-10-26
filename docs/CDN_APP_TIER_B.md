# Tier B via `/cdn-app` (private R2)

Charts, weights, notes, price returns, factors, revenue/quality-risk, and correlation sidecars are **not** world-readable on `storage.stockthemes.ai`.

| Layer | Role |
|-------|------|
| Private R2 | `r2://mosaic-themes/stockthemes_app/themes/<slug>.<sidecar>.json` |
| Pages Function | `https://stockthemes.ai/cdn-app/themes/<slug>.<sidecar>.json` |
| Public CDN | Slim `themes/<slug>.json` (SEO) + site-wide bundles (e.g. factor leaderboards) |

Protected suffixes (Function allowlist): `.app`, `.notes`, `.price_returns`, `.factor_profile`, `.factor_attribution`, `.revenue`, `.quality_risk`, `.composition`, `.chart`, `.correlation_bundle`, `.stock_correlations`, `.theme_neighbors`.

## Gate behavior

- Requires allowlisted `Origin` / `Referer` / `Sec-Fetch-Site: same-origin`
- Soft per-IP rate limit in the Function (~90/min/isolate)
- **Dashboard rate limit (required belt-and-suspenders):** Cloudflare → stockthemes.ai → Security → Rate limiting → create rule:
  - **If** URI Path starts with `/cdn-app/`
  - **Then** Block / challenge when > ~120 requests / 1 minute per IP
  - (API tokens without Firewall edit get 403; use the dashboard)

## Deploy notes

1. `wrangler.toml` binds `MOSAIC_THEMES` → `mosaic-themes`. First Pages deploy with this file attaches the binding.
2. ETL writes Tier B to private R2 and deletes public copies.
3. One-time migrate: `python stockthemes_manifest.py --tier-b-sidecars-only` (skips `.app`; use `--theme-app-sidecars-only` for apps).
4. Build cache: `sync-build-cache.mjs` pulls private sidecars with R2 API credentials. Do **not** copy them into `public/data/themes/`.

## Verify

```bash
# Should 403 without browser Origin
curl -sI "https://stockthemes.ai/cdn-app/themes/<slug>.notes.v0.json"

# Should 404 on public CDN after migrate
curl -sI "https://storage.stockthemes.ai/themes/<slug>.notes.v0.json"
curl -sI "https://storage.stockthemes.ai/themes/<slug>.price_returns.v0.json"
curl -sI "https://storage.stockthemes.ai/themes/<slug>.factor_profile.v0.json"
```
