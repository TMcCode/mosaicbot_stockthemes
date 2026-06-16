# Market-hours price returns on stockthemes.ai

**Slim ETL** (every 15 min) refreshes `price_returns` and chains a **price-only manifest** when each run succeeds. **Full manifest** rebuilds charts/structure **3×/weekday**.

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
