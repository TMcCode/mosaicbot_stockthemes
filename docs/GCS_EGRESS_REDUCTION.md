# GCS egress reduction (stockthemes.ai)

Billing context (Mar 2026): **~$528/mo** on SKU *Download Worldwide Destinations* for project `lateral-raceway-321323`, almost entirely public reads of `gs://stockthemes-public` (~251 MB bucket, ~5 TB/mo transferred). Storage rent is negligible (~$1.50/mo).

This repo implements **client cache**, **CI build cache**, and documents **CDN + ETL cache headers** (MosaicBot).

---

## 1. Cloudflare CDN — Path A (do this first)

**Guide:** [`docs/CLOUDFLARE_CDN_SETUP.md`](./CLOUDFLARE_CDN_SETUP.md)  
**Worker:** [`cloudflare/worker-stockthemes-public.js`](../cloudflare/worker-stockthemes-public.js)  
**Verify:** `npm run verify:cdn`

Production default manifest URL is now **`https://data.stockthemes.ai/manifest.json`** (after Worker is live).

1. Deploy Worker + route `data.stockthemes.ai/*`
2. Apply GCS CORS (command in guide)
3. Redeploy GitHub Pages

---

## 2. ETL `Cache-Control` (MosaicBot)

`FetchEODData/stockthemes_manifest.py` sets long `s-maxage` / `stale-while-revalidate` on publish. **Redeploy the ETL job** after merging so existing objects get new headers on the next upload.

---

## 3. CI build cache (this repo)

| Piece | Role |
|-------|------|
| `scripts/sync-build-cache.mjs` | Prebuild: manifest + small bundles; **theme/group JSON only when GCS md5 (or CDN ETag) changed** |
| `.cache/stockthemes-public/_object_meta.json` | Per-object md5/generation from last successful download |
| `.cache/stockthemes-public/` | On-disk mirror of bucket JSON |
| `src/lib/stockthemesBuildCache.ts` | `next build` reads cache when `STOCKTHEMES_STATIC_PAGES=1` |
| `deploy-pages.yml` | Restores/saves Actions cache for `.cache/stockthemes-public` |

Routine ETL bumps to `manifest.as_of` no longer purge or re-download all `themes/*.json` (MosaicBot ETL already skips unchanged theme uploads via content compare).

Force full re-download: workflow_dispatch **refresh_cache**, or `STOCKTHEMES_BUILD_CACHE_REFRESH=1 npm run build`

---

## 4. Browser hydration cache (this repo)

- `ThemeChartLiveHydrate` uses `stockthemesBrowserFetchCache()` + time-bucket query (`stockthemesCache.ts`, default 2h).
- Tune: `STOCKTHEMES_REVALIDATE_SEC` / `NEXT_PUBLIC_STOCKTHEMES_REVALIDATE_SEC`.

---

## 5. Implemented in repo (deploy to take effect)

| Control | What |
|---------|------|
| **CI skip** | Scheduled deploy skips when `manifest.as_of` unchanged (`scripts/ci-should-build.mjs`) |
| **Cron** | 1×/day (was 3×/day) |
| **Build cache** | `sync-build-cache.mjs` + Actions cache |
| **No live hydrate** | `NEXT_PUBLIC_STOCKTHEMES_DISABLE_LIVE_HYDRATE=1` in Pages build |
| **`/my` compare** | Baked at build via `prepareMyWatchlistCompareData` (no client `compare_themes` fetch) |
| **CDN only** | `normalizePublicDataBase()` blocks `storage.googleapis.com` in prod |
| **Private bucket** | `docs/PRIVATE_BUCKET_SETUP.md` + MosaicBot scripts |

## 6. Optional next steps

- Split `themes/<slug>.chart_1y.json` for smaller hydration payloads.
- Rate-limit / WAF on CDN (`docs/SECURITY_SCALING_PLAYBOOK.md`).
- `home_commentary.v0.json` sidecar for homepage commentary (no theme JSON involved).

---

## Verify in GCP

BigQuery billing export: `lateral-raceway-321323.mosaic_billing_export.gcp_billing_export_v1_*`

```sql
SELECT sku.description, ROUND(SUM(cost), 2) AS usd
FROM `lateral-raceway-321323.mosaic_billing_export.gcp_billing_export_v1_010C44_764578_AF1A87`
WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
  AND project.id = 'lateral-raceway-321323'
  AND service.description = 'Cloud Storage'
GROUP BY 1
ORDER BY usd DESC;
```

After CDN + caches, *Download Worldwide Destinations* should fall sharply within 1–2 weeks.
