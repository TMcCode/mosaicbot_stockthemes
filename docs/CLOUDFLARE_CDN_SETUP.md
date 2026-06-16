# Path A: Cloudflare CDN for `stockthemes-public`

Serve public JSON at **`https://data.stockthemes.ai/`** so browsers and CI hit Cloudflare cache instead of billing GCS egress on every request.

Bucket stays **public** (`allUsers` objectViewer). This is Path A (CDN only), not a private bucket.

---

## Checklist (~15 minutes)

- [ ] **1.** Deploy Worker below (or from `cloudflare/worker-stockthemes-public.js`)
- [ ] **2.** Route `data.stockthemes.ai/*` to that Worker (orange cloud / proxied)
- [ ] **3.** Apply GCS CORS (MosaicBot repo)
- [ ] **4.** Smoke test (`npm run verify:cdn`)
- [ ] **5.** Set GitHub variable + redeploy Pages (or merge defaults in repo)
- [ ] **6.** Update local `.env.local` for dev hydration

---

## 1. Deploy the Cloudflare Worker

1. Log in to [Cloudflare](https://dash.cloudflare.com) → zone **stockthemes.ai**.
2. **Workers & Pages** → **Create** → **Create Worker**.
3. Replace the default script with the contents of  
   [`cloudflare/worker-stockthemes-public.js`](../cloudflare/worker-stockthemes-public.js) in this repo.
4. **Save and deploy**.
5. **Settings** → **Triggers** → **Add route**:
   - Route: `data.stockthemes.ai/*`
   - Zone: `stockthemes.ai`
6. **DNS** (if `data` does not exist): add record  
   `data` → `AAAA 100::` (placeholder) or any dummy — Worker routes override.  
   Ensure the record is **Proxied** (orange cloud).

> **Why a Worker?** A plain CNAME to `c.storage.googleapis.com` often fails to map  
> `data.stockthemes.ai/manifest.json` → `storage.googleapis.com/stockthemes-public/manifest.json`.  
> The Worker rewrites the path explicitly.

---

## 2. Cache rules (optional tuning)

Default Worker `cf.cacheEverything` + origin `Cache-Control` (from ETL) is enough for most cases.

Optional **Cache Rules** for `data.stockthemes.ai`:

- Edge TTL: respect origin, cap 1 day for `*.json`
- Browser TTL: respect origin

---

## 3. GCS CORS (browser hydration)

From **MosaicBot** repo root:

```bash
gcloud storage buckets update gs://stockthemes-public \
  --project=lateral-raceway-321323 \
  --cors-file=docs/stockthemes/gcs-cors.example.json
```

(`gcs-cors.example.json` includes `https://data.stockthemes.ai` and `https://stockthemes.ai`.)

---

## 4. Point the app at the CDN

**Production default in this repo:** `https://data.stockthemes.ai/manifest.json`

**GitHub** → `mosaicbot_stockthemes` → Settings → Actions → Variables:

```text
NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL=https://data.stockthemes.ai/manifest.json
```

**Local** `.env.local`:

```text
NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL=https://data.stockthemes.ai/manifest.json
```

Redeploy GitHub Pages after the Worker answers (workflow **Deploy to GitHub Pages**).

---

## 5. Smoke test

```bash
npm run verify:cdn
```

Or manually:

```bash
curl -sI "https://data.stockthemes.ai/manifest.json" | egrep -i 'HTTP|cache-control|cf-cache-status'
curl -sI "https://data.stockthemes.ai/manifest.json" | egrep -i 'cf-cache-status'
```

Expect: first request `cf-cache-status: MISS`, second `HIT`.

---

## 6. Purge after manifest (automated)

MosaicBot `stockthemes_manifest.py` purges `https://data.stockthemes.ai/` after each publish when **`CLOUDFLARE_API_TOKEN`** and **`CLOUDFLARE_ZONE_ID`** are set on the Cloud Run job (Zone → Cache Purge permission). See `MosaicBotMain_Local_Dev/docs/STOCKTHEMES_MARKET_HOURS_PUBLISH.md`.

Purge API calls are **free**; expect minor GCS egress when the CDN refetches (~$10–25/mo at 6×/weekday manifest).

## 7. Billing impact

Most repeat traffic should stop accruing **GCS Download Worldwide** charges. Direct  
`https://storage.googleapis.com/stockthemes-public/...` links still bill GCS if used — avoid them in the app.

See [`GCS_EGRESS_REDUCTION.md`](./GCS_EGRESS_REDUCTION.md).

MosaicBot copy of this doc: `MosaicBotMain_Local_Dev/docs/stockthemes/CLOUDFLARE_CDN_SETUP.md`.

---

## 8. Private bucket (stop direct GCS egress)

After the Worker works with public bucket, follow **`docs/PRIVATE_BUCKET_SETUP.md`** to remove `allUsers` access.
