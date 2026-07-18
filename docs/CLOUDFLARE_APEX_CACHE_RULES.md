# Cloudflare cache rules for stockthemes.ai

The apex site is a GitHub Pages static export proxied by Cloudflare. Configure this rule in the
`stockthemes.ai` zone under **Caching → Cache Rules**.

## Immutable Next.js assets

Expression:

```text
(http.host eq "stockthemes.ai" and starts_with(http.request.uri.path, "/_next/static/"))
```

Settings:

- Cache eligibility: **Eligible for cache**
- Edge TTL: **Ignore cache-control header and use this TTL → 1 year**
- Browser TTL: **Override origin and use this TTL → 1 year**
- Cache key: **Default**

Next.js filenames under `/_next/static/` are content hashed, so a new deployment creates new URLs.
Do not broaden this rule to HTML, icons, or JSON paths.

## R2 JSON

Do not apply the apex rule to `storage.stockthemes.ai`. Public JSON and sidecars continue to use
the `Cache-Control` metadata written by the MosaicBot ETL and the existing R2 custom-domain cache.

## Verification

After the next Pages deployment, request any emitted chunk twice:

```bash
curl -I https://stockthemes.ai/_next/static/chunks/<content-hash>.js
```

Expected headers:

```text
cache-control: public, max-age=31536000
cf-cache-status: HIT
```

The origin may also include `immutable`. The first request may report `MISS`; the second should
report `HIT`.
