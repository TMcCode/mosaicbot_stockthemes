# Theme Snapshots (tear sheets)

Local screenshot-ready HTML for marketing / social — **not** part of the stockthemes app runtime.

## Build one theme

```bash
cd mosaicbot_stockthemes
python3 tear-sheets/build.py --slug business-services-26-ai-governance-trust-compliance
```

Writes `tear-sheets/out/<slug>.html` and caches CDN JSON under `tear-sheets/_data/`.

Offline rebuild from cache:

```bash
python3 tear-sheets/build.py --slug <slug> --offline
```

Refresh the polished AI Governance aliases too:

```bash
python3 tear-sheets/build.py --slug business-services-26-ai-governance-trust-compliance --also-v6
```

## View (live returns)

With `npm run dev` running:

```
http://localhost:3000/tear-sheets/out/<slug>.html
```

(`public/tear-sheets` symlinks here so Next can serve the files and proxy `/stockthemes-data`.)

## Locked template (v6)

| Piece | Rule |
|-------|------|
| Canvas | 1720×900 |
| Perf strip | 1D → 10D → Iran War → YTD → 1Y → 2Y |
| Middle panels | Theme Revenue · Theme Quality & Setup · Theme Factor Tilt · Theme Keywords |
| Factor read | Model fit (R²/conf/beta) · Sector · Read (skips Market Beta as lead) · Cohesion |
| Keywords | Top of policy / product / events / intent buckets |
| Holdings | Top 16 by weight, 2 columns (`--holdings N`) |
| Skinny | `--skinny` / `--auto-skinny` omits datasets · keywords · where-to-watch |
| Live poller | `price_returns` + `spy_snapshot` every 60s (ET 12-hour clock) |

Admin (local): **Theme Snapshot** tile → open and/or download HTML.

Ask the agent: *“Build me a snapshot for `<slug>`”* → run `build.py --slug …`.
