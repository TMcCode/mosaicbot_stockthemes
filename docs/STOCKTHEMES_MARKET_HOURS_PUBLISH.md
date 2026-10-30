# Market-hours price returns on stockthemes.ai

**Slim ETL** (every 15 min) refreshes `price_returns` and chains a **price-only manifest** when each run succeeds. **Full manifest** rebuilds charts/structure **3×/weekday** (including stock page JSON under `stocks/` + Tier B `stockthemes_app/stocks/`).

**Stock pages — operating notes**

| Path | Who writes | Pages rebuild? |
|------|------------|----------------|
| Public `stocks/<T>.json` + Tier B `.app.v0.json` | **Full** manifest only | Yes (when `as_of` changes / scheduled bake) |
| Tier B `stocks/<T>.price_returns.v0.json` | **Price-only** + full | **No** — browser hydrates via `/cdn-app` (~5 min); HTML bake unchanged |
| Ticker charts `tickers/<T>.chart.v0.json` | Full / chart-sidecars job | No (client fetch) |

**Site sync:** `STOCKTHEMES_SYNC_STOCKS` defaults **off** in `sync-build-cache.mjs` (and static params/sitemap) until the full stocks tree is on R2; use `STOCKTHEMES_SYNC_STOCK_TICKERS=AAPL,0700.HK` for a limited warm. CI wires the same vars (`deploy-pages.yml`). After a full bake, check GHA job duration + `npm run report:export` (file count); if export regularly **>20 min** or near CF file limits, cap the universe or Worker-split.

| Step | Weekdays (ET) |
|------|----------------|
| **Slim + price-only** | Every 15 min, 4:00 AM–9:45 PM (chained; not clock-offset) |
| **Full intraday** (dashboard) | 10:15, 2:15, 5:15 |
| **Full manifest** | 10:30, 2:30, 5:30 (`stockthemes-manifest-noon-7pm-et`) |
| **Pages rebuild** | ~11:15, 3:15, 6:15 (+ 5 AM daily; skips when `as_of` unchanged) |

Setup in MosaicBot repo:

```bash
./scripts/setup_intraday_slim_scheduler.sh
./scripts/setup_stockthemes_price_only_scheduler.sh
./scripts/setup_intraday_etl_scheduler.sh
./scripts/setup_stockthemes_manifest_scheduler.sh
```

See `MosaicBotMain_Local_Dev/docs/STOCKTHEMES_MARKET_HOURS_PUBLISH.md`.
