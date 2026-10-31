# Stock pages (`/stocks/[ticker]`) — implementation plan

**Status:** Ready to build (decisions locked 2026-10-30)  
**Repos:** `mosaicbot_stockthemes` (site) + `MosaicBotMain_Local_Dev` (`stockthemes_manifest.py` / Contabo)  
**Related:** `docs/AUTH_WATCHLIST_IMPLEMENTATION_PLAN.md` (ticker watchlist gated on this), `docs/stockthemes/PUBLIC_VS_PROTECTED_DATA.md` (Main)

---

## Product decisions (locked)

| Topic | Decision |
|-------|----------|
| Route | `/stocks/[ticker]` on **stockthemes.ai** only (no stockcontext deep-links in v0) |
| Universe | All theme constituents (~8k from `sym_theme_df` / `search_index`) |
| Manifest | **Do not** add a stock array to `manifest.json`. Use `search_index` (or slim `stocks_index.v0.json`) for params/sitemap |
| v0 UI | Identity + theme membership · live returns table (theme columns 1:1) · stockcontext-style chart (ticker + SPY default) · **theme** heatmap (not tickers) · theme checkboxes fetch chart lines **on check** |
| v1 UI | “Theme fit & theme drivers” (corr / beta / R² / factor tilt) |
| Later | Thesis / bull / bear if available; ticker watchlist ★ (keep `WATCHLIST_TICKERS_UI_ENABLED` off until then) |
| Chart default | Ticker + SPY only; member themes unchecked |
| Theme sort | Stock **weight in theme** descending |
| Theme cap | Cap visible rows/overlays (e.g. top 12) + **Show more** |
| URL keys | Preserve exchange suffix for intl (`XXX.TO`, etc.); US can stay bare `AAPL` as today in search_index |
| Anti-scrape | Same Tier A/B as themes; numeric feeds via `/cdn-app` |
| Pages rebuilds | Same app; Contabo stays chatty on **JSON**, Pages stays **occasional bake** (price-only already 3h-throttled). No second Pages project unless measured build pain |
| CI | Keep `STOCKTHEMES_SYNC_STOCKS=0` (20k file cap). Long-tail stocks = Pages Function → `/stocks/__shell` (not full SSG) |

---

## Architecture

```text
ETL (full / catalog)
  → stocks/<TICKER>.json                    Tier A (public) — SEO shell
  → mosaic-themes/stockthemes_app/stocks/<TICKER>.app.v0.json       Tier B
  → mosaic-themes/stockthemes_app/stocks/<TICKER>.price_returns.v0.json  Tier B
  → reuse tickers/<TICKER>.chart.v0.json    Tier B (existing overlay charts)
  → search_index ticker rows (already)      params + search links

Price-only (~10 min)
  → patch stocks/<T>.price_returns.v0.json (+ digest skip)
  → do NOT rewrite all public stocks/*.json
  → do NOT force Pages rebuild (existing 3h throttle)

Site
  → SSG fixtures/allowlist only (`STOCKTHEMES_SYNC_STOCKS=0`)
  → Long tail: `functions/stocks/[ticker].js` (SEO meta) → `/stocks/__shell` client runtime (same lens UI)
  → Hard <a> / location.assign for stock links (Next soft-nav cannot reach unbaked paths)
  → HTML: name, theme list (slugs/names; weights only if not scrapable in view-source — prefer client merge from Tier B)
  → Client: /cdn-app price_returns + chart; theme overlay lines fetch themes/<slug>.chart.v0.json on check
```

### Tier split

| Tier A (public `stocks/<T>.json`) | Tier B (`/cdn-app/stocks/...` + existing theme/ticker charts) |
|-----------------------------------|---------------------------------------------------------------|
| `ticker`, `name`, `as_of`, `build_id` | `price_returns` / compare metrics (theme column set) |
| Theme membership: `slug`, `name`, `group_slug` (no weights in public if matching theme slim rules) | Weights for sort · heatmap numeric matrix |
| SEO blurb (optional short) | Chart: reuse `tickers/<T>.chart.v0.json` + SPY + on-demand theme charts |
| | (v1) fit / factor sidecars |

---

## Page layout (v0)

1. **Header** — ticker, company name, (optional logo)  
2. **Chart** — stockcontext-style performance vs SPY; period chips (1W…5Y + selected dates); theme overlay checkboxes (weight order, capped + Show more); **fetch theme series on check**  
3. **Top right** — **member themes table** with Period Returns + Earnings Returns + **Revenue** / **Rev Revisions** (signed-in; same lazy `stocks/<T>.revenue.v0.json`; Rev Revisions adds transposed % Pos CQ/CY/NY Δ)  
4. **Returns table** — same columns as theme constituent / compare table (1D, 10D, MTD, YTD, Period, LstRpt, SelectedDates, …) for **this ticker**  
5. **Themes list** — links to `/themes/[slug]`, sorted by weight, capped + Show more  

**Not in v0:** theme-fit corr panel, thesis/bull/bear, watchlist ★, stockcontext links.

---

## Build plan (step by step)

### Phase 0 — Ops hygiene (same week, low risk)

- [x] Confirm Contabo price-only → Pages uses `STOCKTHEMES_PAGES_MIN_INTERVAL_SEC=10800` (already in `run-slim-then-price-manifest.sh`)
- [x] Treat full manifest (~3×/weekday) + overnight as primary HTML bake; don’t add new Pages triggers for stock price-only
- [x] Update stale “~2–3k constituents” wording in `INTRADAY_SLIM_ETL.md` to ~8k (docs only)

### Phase 1 — Schemas + fixtures

- [x] Add JSON Schema + TS types:
  - `stock.detail.v0` (public) — Main `docs/stockthemes/schemas/` + `src/types/stock.detail.v0.ts`
  - `stock.app.v0` (protected)
  - `stock.price_returns.v0` (protected)
- [x] Document object paths in Main `docs/stockthemes/` (+ `PUBLIC_VS_PROTECTED_DATA.md` stock rows)
- [x] Add `public/fixtures/stocks/` samples (`AAPL`, `SHOP.TO`) for local Next
- [ ] Optional: one-ticker manual R2 upload for end-to-end path smoke (before full ETL batch)

### Phase 2 — ETL publish (`stockthemes_manifest.py`)

- [x] Build stock detail from `sym_theme_df` + `ticker_performance_latest` (+ company name source already used by search_index)
- [x] Upload **Tier A** `stocks/<TICKER>.json` on **full** publishes (digest/ETag skip via `st_norm_md5`)
- [x] Upload **Tier B** `stockthemes_app/stocks/<TICKER>.app.v0.json` (weights + theme compare_returns for heatmap)
- [x] Upload **Tier B** `stocks/<TICKER>.price_returns.v0.json` on full **and** price-only (digest skip)
- [x] Reuse existing `tickers/<TICKER>.chart.v0.json` — not duplicated under `stocks/`
- [x] Intl tickers keep exchange suffix in object keys (`SHOP.TO`)
- [x] Protected suffixes: existing `*.app.v0.json` / `*.price_returns.v0.json` gates cover stock paths under `/cdn-app`
- [x] **Do not** append stocks[] to `manifest.json`; universe = search_index tickers
- [x] Contabo: no new job — folded into full `main()` + `publish_price_returns_only()`; `STOCKTHEMES_PUBLISH_STOCKS=0` to disable; `STOCKTHEMES_PUBLIC_STOCKS_PREFIX` / `STOCKTHEMES_STOCK_UPLOAD_WORKERS`
- [x] Smoke: limited R2 publish (`STOCKTHEMES_STOCK_UPLOAD_TICKERS`) verified `stocks/AAPL.json` + `0700.HK` + private sidecars
- [x] Note in `STOCKTHEMES_MARKET_HOURS_PUBLISH.md` / `INTRADAY_SLIM_ETL.md` (brief)

### Phase 3 — Site route + data loaders

- [x] `src/app/stocks/[ticker]/page.tsx` — `generateStaticParams` gated (`STOCKTHEMES_SYNC_STOCKS` / `STOCKTHEMES_SYNC_STOCK_TICKERS` + fixtures); `dynamicParams = false`
- [x] `loadStockDetail` / Tier B merge (`mergeStockApp`) + price_returns sidecar load
- [x] Extend `scripts/sync-build-cache.mjs` for `stocks/` (+ private `.app` / `.price_returns`); default off; soft 404 until full publish
- [x] Sitemap: include `/stocks/...` (same gate as static params)
- [x] Metadata / JsonLd (non-numeric)

### Phase 4 — UI (v0 lens)

- [x] Stock chart client (`StockPerformanceChart` — stockcontext overlay UX + stockthemes LW lock / period toolbar)
- [x] Default series: ticker + SPY; theme overlays on check → `/cdn-app/themes/<slug>.chart.v0.json` (via `fetchChartSidecar` memory cache); max 10 theme overlays
- [x] Theme heatmap panel (`StockLensPanels` — heat styles + Show more)
- [x] Returns table — `resolveConstituentPriceReturnColumns` / `formatConstituentPct` / heat cells
- [x] Theme list + cap + Show more; links to `/themes/[slug]`
- [x] Live price hydration — `useLiveStockPriceReturns` (~5 min, price_returns sidecar)
- [x] Link `TickerBadge` / search ticker hits → `/stocks/[ticker]` (constituents inherit via badge)

### Phase 5 — Perf / anti-scrape / CI gate

- [x] Keep static HTML slim — `stockDetailPublicSeed` + client `/cdn-app` hydrate (`StockLensPanels`); no weights/returns/SPY seed in RSC when CDN base set
- [x] Verify Tier B stock paths — `npm run verify:tier-b` + post-deploy curl in `deploy-pages.yml`; docs in `CDN_APP_TIER_B.md`
- [x] Measure / gate full export — default fixtures-only; `STOCKTHEMES_SYNC_STOCKS` / `_TICKERS` via repo vars; `npm run report:export` + `stock_page_count` in deploy meta (**record wall time on first `SYNC_STOCKS=1` bake**)
- [x] Bundle budgets — `maxStockHtml` in `verify-build-budgets.mjs` (+ stockInitialJs report-only)
- [x] Escape hatch noted — `report-export-stats` warns near ~18k files; Worker-split only if full bake >20 min / file pressure

### Phase 6 — Docs + watchlist handoff

- [x] Update `AUTH_WATCHLIST_IMPLEMENTATION_PLAN.md` Phase 4 checklist (public stocks done; ★ still off)
- [x] Operating notes: price-only patches stock `price_returns`; Pages bake unchanged (`STOCKTHEMES_MARKET_HOURS_PUBLISH.md` site + Main `INTRADAY_SLIM_ETL.md` / market-hours)
- [x] **Out of this plan (explicit):** enable `WATCHLIST_TICKERS_UI_ENABLED`, `compare_tickers.v0.json`, thesis/bull/bear, theme-fit panel (v1) — see watchlist plan Phase 4

---

## v1 (explicitly later)

- [ ] Theme fit & theme drivers (corr / beta / R² / stock-specific / factor–sector tilt)
- [ ] Thesis / bull / bear when editorial exists
- [ ] Ticker watchlist + `compare_tickers.v0.json`

---

## Success criteria

- [x] `/stocks/AAPL` and an intl suffix ticker load fast: thesis-free shell + live numbers via `/cdn-app`
- [x] Theme page (`TickerBadge`) and search link to stock pages
- [x] Manifest size unchanged (no stocks array)
- [x] Price-only runtime stays sidecar-bound; Pages not rebuilt every 10 min
- [x] Same anti-scrape posture as themes (`verify:tier-b`)
- [x] On-demand long-tail stocks via Pages Function + `/stocks/__shell` (replaces full SSG under 20k file cap)
- [ ] Cancelled: full stock SSG (`STOCKTHEMES_SYNC_STOCKS=1`) — exceeds CF Pages free file limit (~89k)

---

## Suggested implementation order (engineering)

1. Schema + fixture + one-ticker manual R2 upload  
2. ETL batch publish (full) + price-only hook  
3. Next route SSG for fixtures → then full index  
4. Chart + returns + heatmap UI  
5. Links + live hydrate + gate verification  
6. Docs / Contabo notes / measure CI  

**Estimate:** ~1–2 weeks calendar for a credible v0 if ETL and UI proceed in parallel after schema freeze.
