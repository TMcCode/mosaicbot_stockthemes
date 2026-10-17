# stockthemes-substack-feed-proxy

Cloudflare Worker that proxies Alt Data Observer’s public archive JSON.

GitHub Actions runners are blocked by Substack (HTTP 403). The newsletter bake
(`scripts/bake_newsletter_posts.mjs`) falls back to this Worker when the origin
archive/RSS fetch fails.

## Deploy

```bash
export CLOUDFLARE_API_TOKEN=…
export CLOUDFLARE_ACCOUNT_ID=…
npx wrangler@4.14.1 deploy
```

Live URL: `https://stockthemes-substack-feed-proxy.tmclynn421.workers.dev/`

## Resilience

Successful upstream responses are cached for 5 minutes. If Substack returns 403/429, the Worker serves the last-good body when available (`x-proxy-cache: STALE-…`) instead of caching the error.
