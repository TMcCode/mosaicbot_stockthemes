# Cloudflare R2 Storage

`stockthemes-public` is the only bucket that should be publicly readable. It is served at:

```text
https://storage.stockthemes.ai
```

Private ETL buckets are accessed through the S3-compatible R2 API from the backend jobs:

```text
mosaic_themes      -> mosaic-themes
stockthemes-public -> stockthemes-public
mosaic-transcripts -> mosaic-transcripts
```

Required GitHub Actions secrets for `stockthemes`:

```text
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<access-key-id>
R2_SECRET_ACCESS_KEY=<secret-access-key>
```

Non-secret storage defaults are configured in code, not GitHub Actions variables:

```text
scripts/lib/storageConfig.mjs
src/lib/stockthemesStorageConfig.ts
```

Current defaults:

```text
MOSAIC_THEMES_BUCKET=mosaic-themes
STOCKTHEMES_PUBLIC_BUCKET=stockthemes-public
MOSAIC_TRANSCRIPTS_BUCKET=mosaic-transcripts
STOCKTHEMES_PUBLIC_BASE_URL=https://storage.stockthemes.ai
```

The frontend Pages workflow uses only `R2_*` secrets to warm `.cache/stockthemes-public` during static export. Browser-facing URLs use `https://storage.stockthemes.ai`.

One deployment cycle of compatibility aliases remains in code for local transition:

```text
r2_endpoint
r2_access_key_ID
r2_secret_access_key
S3_endpoint_API
STOCKTHEMES_SYNC_VIA_GCS
```

Do not add R2 credentials to tracked files. Local development can use ignored files:

```text
stockthemes/.env.local
bot/.env.local
```
