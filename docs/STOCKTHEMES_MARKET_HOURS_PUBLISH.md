# Market-hours price returns on stockthemes.ai

Manifest republishes `themes/<slug>.json` with **`price_returns`** **3× on weekdays** (ET). Intraday ETL is **not** changed by this setup.

| Step | Weekdays (ET) |
|------|----------------|
| **Intraday** (existing) | Your current schedule |
| **Manifest** | 11:00, 3:00, 5:00 ET (`stockthemes-manifest-noon-7pm-et` in GCP) |

Setup in MosaicBot repo:

```bash
./scripts/setup_stockthemes_manifest_scheduler.sh
# (from MosaicBot repo; gcloud as tmclynn421@gmail.com, not cdn-reader SA)
```

See `MosaicBotMain_Local_Dev/docs/STOCKTHEMES_MARKET_HOURS_PUBLISH.md`.
