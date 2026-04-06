# Performance and Efficiency Backlog

This document tracks potential efficiency improvements for `mosaicbot_stockthemes`.

Goal: keep initial load fast, keep chart interactions smooth, and keep business logic ETL-first where possible.

## Principles

- Prefer moving data shaping and aggregation to ETL (`MosaicBotMain_Local_Dev`) instead of doing logic in the website runtime.
- Avoid adding new blocking fetches on first paint.
- Keep client bundles small and defer heavy UI code (`next/dynamic`) where practical.
- Optimize for correctness first, then performance.

## Current State Snapshot

- Chart code is already lazy-loaded in a separate client chunk.
- Home/group/theme pages now reuse SPY snapshot work server-side (memoized outside dev).
- Benchmark line render is guarded to avoid sparse/misleading overlays.
- Theme detail page still computes some derived values from constituents at render time.

## High-Impact, Low-Risk Next Steps

1. Precompute theme totals in ETL
   - Add `total_market_cap_usd` to `themes/<slug>.json`.
   - Frontend reads a single field instead of reducing constituents at runtime.
   - Primary benefit: consistency and simpler UI logic (minimal latency gain).

2. Ensure home trending bundle is canonical
   - Keep `home_trending.v0.json` complete with all compare columns and stable schema.
   - Reduce fallback paths to per-theme detail fetches.
   - Benefit: fewer server fetches and less branching.

3. Centralize benchmark artifact contract
   - Keep `spy_snapshot.v0.json` guaranteed to include a full `performance` series.
   - Add ETL validation to prevent publishing metrics-only snapshots accidentally.
   - Benefit: avoids chart overlay regressions and fallback complexity.

## Medium-Term Improvements

1. Add lightweight artifact validation in CI
   - Validate `manifest.json`, `home_trending.v0.json`, `spy_snapshot.v0.json`, and sample theme/group JSON against schemas.
   - Add required-field checks for key UX fields (for example, `performance.dates`/`values` length).

2. Reduce payload surface for chart-only views
   - Option A: publish a dedicated chart payload (`themes/<slug>.chart_1y.json`).
   - Option B: add compact chart fields to a separate bundle consumed by home/group pages.
   - Benefit: smaller transfer and parse cost where full detail is not needed.

3. Route-level cache policy review
   - Align `revalidate` intervals by artifact type (manifest vs trending vs spy snapshot).
   - Define stale tolerance for each page class (home, list pages, detail pages).

## Longer-Term Opportunities

1. Add periodic performance budgets
   - Track bundle size, LCP, and hydration cost over time.
   - Fail CI on significant regressions beyond agreed thresholds.

2. Progressive enhancement for heavy chart interactions
   - Keep static content and tables immediately interactive.
   - Defer non-critical chart controls until idle if needed.

3. Optional server-side pre-normalized benchmark data
   - If multi-series comparisons grow, publish normalized benchmark variants in ETL.
   - Avoid repeated normalization work in client chart paths.

## Suggested Prioritization

- Phase 1 (now): ETL contract hardening for `spy_snapshot` + `total_market_cap_usd`.
- Phase 2: tighten home trending bundle reliability and fallback behavior.
- Phase 3: chart payload split if page weight starts trending up.
- Phase 4: CI performance budgets and monitoring.

## What Not to Optimize Yet

- Micro-optimizing small array operations in React render paths.
- Rewriting chart implementation without performance evidence.
- Adding complexity for sub-millisecond gains.

## Verification Checklist for Each Change

- `npm run lint` passes.
- `npm run build` passes in a network-capable environment.
- Home, group, and theme detail pages still render benchmark overlays correctly.
- No extra blocking client fetches on first paint.
- No schema drift between ETL output and frontend types.

