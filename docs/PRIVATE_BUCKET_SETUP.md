# Private `stockthemes-public` bucket

Stops scrapers from billing GCS via direct `storage.googleapis.com/...` URLs.  
Traffic must go through **`https://data.stockthemes.ai`** (Cloudflare Worker with service account).

## Order (do not skip)

### 1. Create reader service account (MosaicBot repo)

```bash
cd MosaicBotMain_Local_Dev
./scripts/setup_stockthemes_cdn_reader_sa.sh
```

This creates `stockthemes-cdn-reader@lateral-raceway-321323.iam.gserviceaccount.com` with **objectViewer** on `gs://stockthemes-public` and writes a key to `~/.secrets/stockthemes-cdn-reader.json` (not committed).

### 2. Cloudflare Worker secrets

Workers → your worker → **Settings** → **Variables**:

| Secret | Value |
|--------|--------|
| `GCP_SA_CLIENT_EMAIL` | `stockthemes-cdn-reader@lateral-raceway-321323.iam.gserviceaccount.com` |
| `GCP_SA_PRIVATE_KEY` | Full PEM from the JSON key file (`private_key` field) |

Redeploy the worker (`cloudflare/worker-stockthemes-public.js`).

Verify:

```bash
cd mosaicbot_stockthemes
npm run verify:cdn
```

### 3. Remove public internet access to objects

```bash
cd MosaicBotMain_Local_Dev
./scripts/stockthemes_public_bucket_make_private.sh
```

Direct `https://storage.googleapis.com/stockthemes-public/manifest.json` should return **403**.

### 4. Site + CI

Browsers and production use `https://data.stockthemes.ai` only (see `stockthemesClientConfig.ts`).

**GitHub Actions** cannot use the Worker’s GCP credentials. After the bucket is private, CI must read GCS directly:

1. **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `STOCKTHEMES_GCS_SA_JSON`
   - Value: entire contents of `~/.secrets/stockthemes-cdn-reader.json` (same key as the Worker)
2. Re-run **Deploy to GitHub Pages** (workflow_dispatch with *refresh_cache* if the prior run failed mid-sync).

The workflow sets `STOCKTHEMES_SYNC_VIA_GCS=1` so `sync-build-cache.mjs` uses the service account instead of anonymous CDN fetches (which return **403**).

**Local prebuild** (optional): `STOCKTHEMES_GCS_SA_JSON_FILE=$HOME/.secrets/stockthemes-cdn-reader.json STOCKTHEMES_SYNC_VIA_GCS=1 npm run build`

---


## Rollback

```bash
gcloud storage buckets add-iam-policy-binding gs://stockthemes-public \
  --project=lateral-raceway-321323 \
  --member=allUsers \
  --role=roles/storage.objectViewer
```
