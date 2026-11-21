# Corpus scrape hardening (audit + Cloudflare)

**Audited:** 2026-11-21  
**Goal:** Raise the cost of bulk-harvesting the theme corpus without blocking Google or normal browsing.

## Live inventory

| Artifact | Anonymous access | Size (approx) | Risk |
|----------|------------------|---------------|------|
| `themes/<slug>.json` | Public CDN `200` | ~5 KB each (~6–8 MB universe) | Low — Tier A (thesis + tickers, **no weights**) |
| `themes/<slug>.app.v0.json` on `storage.stockthemes.ai` | `404` | — | OK — Tier B off public bucket |
| `/cdn-app/themes/<slug>.app.v0.json` | `403` without Origin; `200` with `Origin: https://stockthemes.ai` | ~250–500 KB | Medium — Origin spoof still works; soft Function limit only |
| `compare_themes.v0.json` | Public `200` | **~1.4 MB** | **High** — full multi-horizon return matrix for ~1.5k themes in one GET |
| `search_index.v0.json` | Public `200` | **~2.5 MB** | Medium — membership graph (ticker → theme_slugs) + aliases |
| `manifest.json` | Public `200` | **~1.8 MB** | Low–medium — catalog + ranks + methodology prose |
| Theme HTML `/themes/<slug>` | Public | ~140 KB | Medium — hero treemap still bakes **weights + 1Y %** into HTML |

**Verdict:** Slim theme JSON + private Tier B sidecars are in place. The remaining “download the whole corpus cheaply” paths are (1) `compare_themes.v0.json`, (2) Origin-spoofed `/cdn-app` crawling, (3) HTML treemap weights at scale.

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
| Covers | `/cdn-app/*`, storage harvest bundles + `themes/*.json`, apex `/themes/*` HTML |
| Then | Block when **> 30 requests / 10 seconds** per IP |
| Mitigation | 10s |

That replaces the older `/cdn-app`-only rule (20/10s). Soft limit inside `functions/cdn-app/[[path]].js` remains belt-and-suspenders.

## Token permissions (so CI can manage rules later)

Create a Cloudflare API token with:

- Zone → **Zone WAF** → Edit  
- Zone → **Zone** → Read  
- Account → **Account Rulesets** → Edit *(if using modern rate-limit rulesets)*

Store as `CLOUDFLARE_WAF_API_TOKEN` (separate from purge-only `CLOUDFLARE_API_TOKEN`). Do not reuse the purge token for WAF.

## Code follow-ups (after dashboard rules)

1. **Slim or gate `compare_themes.v0.json`** — keep home/compare UX via smaller public slices (`home_top_movers`, rank boards) or move full horizons to `/cdn-app/compare_themes.app.v0.json`.
2. **Stop baking treemap weights into static theme HTML** — client-hydrate weights from `/cdn-app` like stock pages (Tier A HTML keeps tickers only).
3. **Session / signed cookie for `/cdn-app`** — kill Origin spoof (larger change).

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

## Related

- `docs/CDN_APP_TIER_B.md` — Function gate + private R2
- `docs/SECURITY_SCALING_PLAYBOOK.md` — broader scaling tiers
- MosaicBot `docs/stockthemes/PUBLIC_VS_PROTECTED_DATA.md` — Tier A/B cut
