# Tier B via `/cdn-app` (private R2)

Charts, weights, and related sidecars are **not** world-readable on `storage.stockthemes.ai`.

| Layer | Role |
|-------|------|
| Private R2 | `r2://mosaic-themes/stockthemes_app/themes/<slug>.app.v0.json` |
| Pages Function | `https://stockthemes.ai/cdn-app/themes/<slug>.app.v0.json` |
| Public CDN | Slim `themes/<slug>.json` (SEO) only |

## Gate behavior

- Requires allowlisted `Origin` / `Referer` / `Sec-Fetch-Site: same-origin`
- Soft per-IP rate limit in the Function (~90/min/isolate)
- Add a Cloudflare **Rate limiting** rule in the dashboard (token needs Firewall edit) for `/cdn-app/*` as belt-and-suspenders

## Deploy notes

1. `wrangler.toml` binds `MOSAIC_THEMES` → `mosaic-themes`. First Pages deploy with this file attaches the binding (account must own that R2 bucket).
2. ETL / backfill: `python stockthemes_manifest.py --theme-app-sidecars-only` writes private objects and deletes public `.app.v0.json`.
3. Build cache: `sync-build-cache.mjs` pulls private apps with R2 API credentials.

## Verify

```bash
# Should 403 without browser Origin
curl -sI "https://stockthemes.ai/cdn-app/themes/space-supply-chain-26-surveillance-satellites.app.v0.json"

# Should 404 on public CDN after migrate
curl -sI "https://storage.stockthemes.ai/themes/space-supply-chain-26-surveillance-satellites.app.v0.json"
```
