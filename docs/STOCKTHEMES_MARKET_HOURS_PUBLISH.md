# Market-hours price returns on stockthemes.ai

Manifest republishes `themes/<slug>.json` with **`price_returns`** **6× on weekdays** (ET). Intraday ETL is **not** changed by this setup.

| Step | Weekdays (ET) |
|------|----------------|
| **Intraday** (existing) | 10:15, 12:15, 2:15, 3:15, 4:15, 5:15 |
| **Manifest** | 10:30, 12:30, 2:30, 3:30, 4:30, 5:30 (`stockthemes-manifest-noon-7pm-et` in GCP) |
| **Pages rebuild** | ~11:00, 1:00, 3:00, 4:00, 5:00, 6:00 (GitHub Actions; skips when `as_of` unchanged) |

Setup in MosaicBot repo:

```bash
./scripts/setup_stockthemes_manifest_scheduler.sh
# (from MosaicBot repo; gcloud as tmclynn421@gmail.com, not cdn-reader SA)
```

See `MosaicBotMain_Local_Dev/docs/STOCKTHEMES_MARKET_HOURS_PUBLISH.md`.
