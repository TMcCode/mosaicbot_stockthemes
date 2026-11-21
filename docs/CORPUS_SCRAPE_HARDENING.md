# Corpus scrape hardening (audit + Cloudflare)

**Audited:** 2026-11-21  
**Goal:** Raise the cost of bulk-harvesting the theme corpus without blocking Google or normal browsing.

## Live inventory

| Artifact | Anonymous access | Size (approx) | Risk |
|----------|------------------|---------------|------|
| `themes/<slug>.json` | Public CDN `200` | ~5–8 KB each (~6–10 MB universe) | Low — Tier A (thesis + tickers + mcap, **no weights**) |
| `themes/<slug>.app.v0.json` on `storage.stockthemes.ai` | `404` | — | OK — Tier B off public bucket |
| `/cdn-app/themes/<slug>.app.v0.json` | `403` without Origin; `200` with `Origin: https://stockthemes.ai` | ~250–500 KB | Medium — Origin spoof still works; soft Function limit only |
| `compare_themes.v0.json` | Public `200` | **~0.9–1.0 MB** after slim (was ~1.4 MB) | **High** — multi-horizon return matrix; previews/ranks stripped (use `rank_10d.v0.json` / group JSON) |
| `search_index.v0.json` | Public `200` | **~2.5 MB** | Medium — membership graph (ticker → theme_slugs) + aliases |
| `manifest.json` | Public `200` | **~1.8 MB** | Low–medium — catalog + ranks + methodology prose |
| Theme HTML `/themes/<slug>` | Public | ~140 KB | Low–medium — treemap weights hydrate via `/cdn-app` when CDN base is set |

**Verdict:** Slim theme JSON + private Tier B sidecars + no baked treemap weights are in place. Home/compare SSR no longer pull the full compare corpus. Remaining harvest paths: (1) public `compare_themes.v0.json` (still one-GET matrix), (2) Origin-spoofed `/cdn-app` crawling.

Do **not** `Disallow: /themes` or noindex themes — that kills SEO without stopping scrapers.

## Cloudflare rate limits (required)

Local ETL/Pages tokens only have cache-purge scope. They return **Authentication error** on Rate Limiting / WAF APIs.

**Preferred:** create a token with **Specified Domains → stockthemes.ai → Zone WAF Rules → Edit**, set `CLOUDFLARE_WAF_API_TOKEN` + `CLOUDFLARE_ZONE_ID`, then:

```bash
npm run apply:corpus-rate-limits
```

### Plan limits (current stockthemes.ai zone)

Many non-Enterprise zones allow only **1** rate-limit rule and period **10 seconds**. The apply script upserts a **single combined rule**:

| Field | Value |
|-------|--------|
| Name | `stockthemes corpus scrape guard` |
| Covers | `/cdn-app/*`, storage harvest bundles + `themes/*.json` only (**not** apex HTML) |
| Then | Managed challenge when **> 120 requests / 10 seconds** per IP |
| Mitigation | 10s |

**Do not** include apex `/themes/*` HTML — Next.js link prefetch + normal browsing 1015’d real users at 30/10s. Soft limit inside `functions/cdn-app/[[path]].js` remains belt-and-suspenders.

If you already applied the old rule, re-run `npm run apply:corpus-rate-limits` or edit the dashboard rule to match the table above.

## Token permissions (so CI can manage rules later)

Create a Cloudflare API token with:

- Zone → **Zone WAF** → Edit  
- Zone → **Zone** → Read  
- Account → **Account Rulesets** → Edit *(if using modern rate-limit rulesets)*

Store as `CLOUDFLARE_WAF_API_TOKEN` (separate from purge-only `CLOUDFLARE_API_TOKEN`). Do not reuse the purge token for WAF.

## Code follow-ups (after dashboard rules)

1. **Gate `compare_themes.v0.json` behind `/cdn-app`** (optional) — public matrix still harvestable; Origin-gated Tier B would raise the bar further.
2. ~~Stop baking treemap weights into static theme HTML~~ — done (CDN hydrate).
3. **Session / signed cookie for `/cdn-app`** — kill Origin spoof (larger change).
4. ~~Slim public compare rows~~ — drop `tickers_preview` / `rank_10d` / membership timestamps from public upload; home uses `home_top_movers` instead of SSR compare.

## Verify after enabling rules

```bash
# Tier B still gated
curl -sI "https://stockthemes.ai/cdn-app/themes/ai-25-semiconductors.app.v0.json"   # 403
curl -sI -H "Origin: https://stockthemes.ai" \
  "https://stockthemes.ai/cdn-app/themes/ai-25-semiconductors.app.v0.json"         # 200

# Public Tier A still open
curl -sI "https://storage.stockthemes.ai/themes/ai-25-semiconductors.json"         # 200

# Burst should eventually 429 (run from one IP; don't DDoS yourself)
# for i in $(seq 1 200); do curl -s -o /dev/null -w "%{http_code}\n" \
#   -H "Origin: https://stockthemes.ai" \
#   "https://stockthemes.ai/cdn-app/themes/ai-25-semiconductors.app.v0.json"; done
```

## PostHog (analytics noise)

Scrapers that execute JS still inflate unique users / ~10s sessions. Client init in `src/lib/posthogClient.ts`:

- Skips known bot / `navigator.webdriver` UAs
- Waits for human engagement (pointer/key/scroll/touch/mousemove) or 12s visible dwell before `posthog.init`
- `person_profiles: "identified_only"` so anonymous crawl traffic does not mint persons
- Dev: no capture unless `NEXT_PUBLIC_POSTHOG_DEBUG=1`

Dashboard tip: filter insights to session duration ≥ 30s or events after `$pageview` + interaction when comparing pre/post.

## Related

- `docs/CDN_APP_TIER_B.md` — Function gate + private R2
- `docs/SECURITY_SCALING_PLAYBOOK.md` — broader scaling tiers
- MosaicBot `docs/stockthemes/PUBLIC_VS_PROTECTED_DATA.md` — Tier A/B cut
