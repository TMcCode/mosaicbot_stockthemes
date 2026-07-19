# Theme Factor Attribution and Constituent Cohesion Plan

Status: proposed implementation plan  
Last updated: 2026-07-18

## Executive decision

Build a signed-in, theme-detail feature called **Factor Drivers** that answers
two different questions:

1. **Why did the theme move?**  
   Attribute the selected-period theme return to a curated set of market,
   style, sector, macro, and narrative factors.
2. **Did the constituents actually move together?**  
   Measure each ticker's leave-one-out relationship to the rest of its theme
   and summarize overall theme cohesion.

This should not be another table of generic 0–100 factor scores. The primary
output is return attribution:

```text
Actual theme return
= factor-explained return
+ theme-specific / unexplained return
```

The feature should support:

- Primary horizons: `1M`, `3M`, `6M`, `YTD`, `1Y`
- Long-term horizons: `3Y`, `5Y`
- Conditional advanced horizon: `10Y` or `MAX`

The selected chart horizon should select the corresponding precomputed
attribution bucket in a future synchronized experience. For v1, Factor Drivers
uses its own compact horizon dropdown, defaults to `1Y`, and leaves the main
chart unchanged. It must not trigger a browser-side regression or a live ETL
request.

Locked v1 product decisions:

- Factor Drivers is the fourth sub-tab inside Quality & Risk.
- Its horizon control is a compact dropdown inside the sub-tab.
- Core attribution and constituent cohesion ship together.
- Narrative overlays are deferred until after the reconciled core model is
  validated.
- Long history may use reconstructed current-membership returns with explicit
  disclosure.

## Non-negotiable performance requirements

The feature must not slow the initial theme page, route rendering, or normal
chart interaction.

Required implementation constraints:

- Do not serialize attribution or cohesion data into the theme page's React
  Server Component props.
- Do not add attribution data to `themes/<slug>.json`.
- Publish a separate, compact sidecar:
  `themes/<slug>.factor_attribution.v0.json`.
- Dynamically import the Factor Drivers panel.
- Fetch its sidecar only after the user opens the Factor Drivers tab.
- Do not prefetch the sidecar on page load or hover.
- Do not poll this sidecar; it is a daily artifact.
- Render the initial panel with HTML/CSS bars and tables. Do not add another
  charting library to the initial or tab-open bundle.
- Hash-gate uploads so unchanged sidecars are not rewritten.
- Keep existing theme-page HTML below the current 200 KB budget.
- Target zero increase in initial route JavaScript. Any feature JavaScript must
  remain in a separate lazy chunk.

Public payload budgets:

- Target raw sidecar size: at most 75 KB per theme
- Target compressed transfer size: at most 25 KB per theme
- Target tab-open fetch plus parse time on a warm CDN: below 300 ms
- Target tab-open main-thread render work: below 100 ms on a typical laptop
- No more than one attribution request per theme page session unless the user
  explicitly retries a failure

## Existing infrastructure

The implementation is not starting from zero.

Current backend components:

- `FetchEODData/theme_factor_scoring.py`
  - builds daily factor proxy returns;
  - calculates 63-, 126-, and 252-day factor betas;
  - calculates multivariate and standalone scores;
  - calculates confidence, correlation, and model R-squared;
  - uses matrix regression across all themes.
- `FetchEODData/ThemeAnalysis_7_ThemeFactorScores.py`
  - loads theme returns and ETF history;
  - runs the factor model;
  - writes private factor parquet artifacts.
- `FetchEODData/publish_factor_sidecars.py`
  - publishes compact per-theme factor profiles and global factor bundles.
- `FetchEODData/ThemeAnalysis_5_FetchEODData_ThemeCorrelations.py`
  - already calculates pairwise constituent correlations by theme;
  - writes `theme_stock_correlations.parquet`;
  - writes `theme_stock_cohesion.parquet`;
  - supports `3M`, `6M`, `1Y`, `3Y`, `YTD`, and `MAX`.

Current frontend components:

- `/factors` already explains and ranks factor exposure.
- Theme factor profile sidecars are already lazy-loadable.
- Theme detail tabs already support protected, dynamically imported panels.

The new work is to calculate **period contribution**, preserve historical
rolling exposure state, add leave-one-out theme fit, publish a slim sidecar, and
render the results only on demand.

## Exposure is not attribution

These terms must remain distinct in code and UI.

### Exposure

Factor beta estimates how sensitive the theme is to a factor:

```text
theme return sensitivity = factor beta
```

A high beta does not mean the factor contributed positively during the selected
period. A high-beta factor can make a negative contribution when that factor
falls.

### Factor movement

Factor movement is the factor proxy's return during the selected period.

### Contribution

Daily contribution is the product of the exposure known before the return and
the factor's daily return:

```text
contribution(theme, factor, t)
= rolling beta(theme, factor, t-1)
* factor return(factor, t)
```

### Theme-specific / unexplained return

The unexplained component is:

```text
theme-specific return
= actual theme return
- sum of factor contributions
```

The UI must not call this `alpha`. It can include company news, earnings,
changing constituent behavior, model error, omitted factors, and true
theme-specific movement.

## Return and regression methodology

### Daily return basis

Use daily log returns for attribution storage and aggregation:

```text
log_return_t = log(price_t / price_t-1)
```

Log-return contributions add cleanly across long periods. This matters for 5Y
and 10Y attribution, where summing arithmetic percentage returns creates
material reconciliation errors.

The UI may convert the selected-period totals back to familiar percentage
returns, but the reconciliation test must run in log-return space.

### Rolling exposure estimation

Do not estimate one fixed beta over a 5Y or 10Y horizon.

Use:

- Primary rolling estimation window: 252 trading days
- Minimum warm-up: 126 valid trading days
- Coefficients used for day `t`: estimated through day `t-1`
- Regression: ridge regression using the existing matrix implementation
- Missing factor/theme observations: require the existing aligned complete-case
  rules and record coverage

Using `t-1` coefficients prevents look-ahead bias.

The existing blended 63/126/252 exposure score can remain on `/factors`. Factor
Drivers should use the stable rolling 252-day exposure for daily attribution.
The two products answer different questions.

### Intercept treatment

Do not expose the regression intercept as a factor contribution. Include the
intercept and daily residual together in the theme-specific/unexplained
component. This keeps the public explanation simple and avoids presenting
historical drift as a tradable factor.

### Period aggregation

For each supported horizon:

1. Sum daily actual log returns.
2. Sum each factor's daily log-return contribution.
3. Sum the theme-specific daily remainder.
4. Geometrically link or convert the totals for display.
5. Verify that displayed components reconcile to actual return within an
   explicit tolerance.

For 3Y, 5Y, and 10Y, also calculate annual contribution blocks so users can see
regime changes rather than only one cumulative number.

## Factor model design

### Fix duplicated directional factors first

The current model contains:

- `GROWTH_DURATION = IWF - IWD`
- `VALUE_CYCLICAL = IWD - IWF`

These are exact opposites. Ridge regression can distribute exposure across both,
but showing both as separate contributions visually double-represents one
economic axis.

Before attribution, replace them in the core model with one signed factor:

```text
GROWTH_VALUE = IWF - IWD
positive contribution = growth/duration
negative contribution = value/cyclical
```

Keep legacy IDs temporarily in existing score artifacts if needed for backward
compatibility, but do not include both in the attribution sum.

### Core attribution model

The initial core model should be deliberately compact:

- Market
- Small Cap
- Growth versus Value
- Momentum
- Quality / Defensive
- Speculative Beta
- Falling Rates
- Credit Risk-On
- Inflation / Commodities
- Strong Dollar

Sector attribution should be a separate hierarchical block, not every sector
residual forced into the same flat table.

Before finalizing the core set:

- calculate the factor correlation matrix;
- calculate variance inflation diagnostics;
- reject exact inverse pairs;
- reject factors whose incremental contribution is unstable;
- document proxy inception dates.

### Narrative overlays

These should initially be shown as **overlays**, not included in the reconciled
core attribution total:

- AI / Innovation
- Crypto
- Meme / Retail
- Oil
- Unprofitable Growth

Reasons:

- several have short histories;
- several overlap strongly with growth, momentum, or speculative beta;
- forcing them into the core model makes long-horizon comparisons inconsistent;
- a 10Y core attribution cannot include recently launched ETFs.

Overlay output should include:

- standalone beta;
- standalone correlation;
- proxy return during the selected period;
- estimated directional relevance;
- available history start date;
- confidence.

The UI must clearly label overlays as non-additive so users do not add them to
the reconciled core contribution total.

## Long-horizon behavior

### Five years

Support 5Y in the first complete release.

Use rolling daily exposures and aggregate contributions. Show:

- cumulative actual return;
- cumulative factor-explained return;
- cumulative theme-specific return;
- contribution by core factor;
- annual contribution breakdown;
- exposure stability;
- data coverage.

### Ten years

Support 10Y only when all required conditions pass:

- at least seven years of valid theme observations;
- at least 80% coverage across the requested period;
- all core factor proxies have sufficient history;
- at least 126 observations exist before attribution begins;
- no unresolved theme-price discontinuity;
- payload remains within the public sidecar budget.

If the conditions fail, omit the 10Y bucket rather than publishing a mostly
empty result.

The 10Y result must be labeled as a historical model estimate. Narrative
overlays should use their own inception-limited windows and must not be blended
into the 10Y core total.

### Theme membership limitation

Current historical theme returns may apply today's theme membership to earlier
periods. That creates survivorship and look-back bias when membership history is
not point-in-time.

Until point-in-time membership exists:

- disclose that long-term attribution uses the available reconstructed theme
  history;
- do not describe 5Y/10Y output as investable historical portfolio performance;
- record the theme-history methodology in the sidecar;
- avoid false precision in long-term confidence.

## Constituent theme fit and cohesion

This is related to Factor Drivers but answers a separate question.

### Leave-one-out theme return

For ticker `i`, build a theme return excluding that ticker:

```text
theme_ex_i_return
= weighted return of all other theme constituents
```

Never correlate a ticker with a basket that contains itself. Otherwise,
high-weight constituents receive mechanically inflated correlations.

Use the same manual theme weights used by the public theme experience,
renormalized after removing the ticker.

### Ticker-level fields

For each supported horizon publish:

- `correlation_to_theme`
- `market_adjusted_correlation`
- `beta_to_theme`
- `theme_r2`
- `stock_specific_share`
- `sample_size`
- `coverage_pct`

Definitions:

```text
correlation_to_theme
= corr(ticker return, leave-one-out theme return)

theme_r2
= correlation_to_theme ^ 2

stock_specific_share
= 1 - theme_r2
```

Market-adjusted correlation should residualize both the ticker and
leave-one-out theme returns against SPY before calculating correlation. This
prevents a high raw correlation from merely reporting that both are equities.

### Theme-level cohesion fields

Publish:

- median leave-one-out constituent correlation;
- weighted-average leave-one-out constituent correlation;
- median market-adjusted correlation;
- correlation dispersion;
- percentage of constituents above 0.50 correlation;
- percentage of constituents with negative correlation;
- valid constituent count;
- coverage.

Do not present low cohesion as automatically bad. A supply-chain theme can
contain economically different businesses. The UI should describe cohesion as
evidence about how tightly the basket trades together, not as a quality grade.

### Horizon policy

Use the same selected horizons as attribution:

- `1M`: available but labeled noisy;
- `3M`, `6M`, `YTD`, `1Y`: primary;
- `3Y`, `5Y`: advanced;
- `10Y`: conditional.

Require a minimum sample count and publish confidence/coverage. Do not show
correlation values based on a handful of observations.

## Proposed private artifacts

Keep detailed history private in `mosaic-themes`.

### Rolling attribution state

`theme_factor_attribution_state.parquet`

Contains enough rolling state to append one new trading day without recomputing
all history:

- latest processed date;
- factor covariance state;
- theme-factor cross-product state;
- rolling observation counts;
- current rolling betas;
- factor-set version;
- methodology version.

Implementation may instead store daily rolling betas if operationally simpler,
but it must support incremental daily updates.

### Daily attribution audit

`theme_factor_attribution_daily.parquet`

Suggested fields:

- date;
- theme;
- actual log return;
- predicted core log return;
- theme-specific log return;
- core factor contributions;
- rolling model R-squared;
- model coverage;
- factor-set version.

This artifact is for ETL audit and backfills. Do not publish it directly to the
browser.

### Constituent theme-fit history

`theme_constituent_fit_daily.parquet` or a horizon-summary parquet.

Prefer horizon summaries unless daily history is required for a future chart.
Avoid creating a large public ticker-by-date-by-theme artifact.

## Proposed public sidecar

Path:

```text
themes/<slug>.factor_attribution.v0.json
```

High-level shape:

```json
{
  "schema_version": "theme.factor_attribution.v0",
  "slug": "example-theme",
  "as_of": "2026-07-18",
  "methodology_version": "core-v1",
  "history_method": "reconstructed_current_membership",
  "horizons": {
    "1M": {
      "actual_return_pct": 8.4,
      "explained_return_pct": 5.1,
      "theme_specific_return_pct": 3.3,
      "model_r2": 0.62,
      "coverage_pct": 100,
      "sample_size": 21,
      "contributions": [
        {
          "factor_id": "MARKET",
          "label": "Market",
          "contribution_pct": 3.2,
          "factor_return_pct": 2.6,
          "average_beta": 1.23,
          "confidence": 0.81
        }
      ],
      "overlays": []
    }
  },
  "cohesion": {
    "1M": {
      "median_correlation": 0.58,
      "market_adjusted_median_correlation": 0.31,
      "dispersion": 0.19,
      "valid_constituents": 18,
      "coverage_pct": 94,
      "constituents": []
    }
  }
}
```

Production payload rules:

- include only the most useful core contribution rows;
- omit null fields;
- round public numeric values;
- do not include daily arrays;
- cap constituent rows at the actual theme membership;
- omit unsupported horizons;
- include factor and methodology versions;
- sort deterministically for hash-gated publishing.

If cohesion makes the sidecar exceed budget, split it into:

- `themes/<slug>.factor_attribution.v0.json`
- `themes/<slug>.theme_fit.v0.json`

Both must remain tab-triggered and independently lazy.

## Frontend product design

### Tab placement

Add a protected fourth sub-tab inside Quality & Risk:

```text
Factor Drivers
```

On narrow screens, retain horizontal sub-tab scrolling rather than shrinking
labels until they are unreadable.

The panel owns a compact horizon dropdown and defaults to `1Y`. Changing the
Factor Drivers horizon does not alter the main chart in v1, and changing the
main chart does not alter Factor Drivers.

### Summary section

Display:

- Actual return
- Factor-explained return
- Theme-specific / unexplained return
- Model R-squared
- Coverage/confidence

The three return values should visibly reconcile.

### Contribution table

Columns:

- Factor
- Direction / exposure
- Factor move
- Estimated contribution
- Confidence

Sort by absolute contribution by default. Positive and negative contributions
must remain visually distinct without relying on color alone.

Every header needs a hover/focus explanation covering:

- what the field measures;
- whether higher/lower has a directional interpretation;
- the selected horizon;
- the rolling estimation window;
- important limitations.

### Constituent fit section

Display:

- theme cohesion summary;
- raw versus market-adjusted cohesion;
- each ticker's correlation to its leave-one-out theme;
- theme beta;
- stock-specific share;
- sample coverage.

Use plain-language labels such as:

- `Theme Correlation`
- `Market-Adjusted Correlation`
- `Theme Beta`
- `Stock-Specific Share`

### Long-term section

For 3Y/5Y/10Y include an expandable annual breakdown. Do not load a charting
library merely to render it. Start with a compact table or CSS contribution
bars.

## Daily ETL runtime estimate

There is no recorded production benchmark for this exact attribution workload,
so these are engineering estimates and must be replaced with measured timings
during implementation.

### Recommended incremental daily path

Expected added daily runtime:

- Load existing factor returns, theme returns, and rolling state: 5–15 seconds
- Append the newest rolling exposure/contribution row: 3–12 seconds
- Build standard horizon summaries: 5–20 seconds
- Build leave-one-out constituent-fit summaries: 5–25 seconds
- Serialize, hash-check, and publish sidecars in parallel: 10–40 seconds

Expected total addition:

```text
Typical: 30–90 seconds
Conservative operational budget: under 2 minutes
Alert threshold: 5 minutes
```

This assumes:

- no new external market-data requests;
- ETF and theme return inputs already produced by existing jobs;
- matrix/vector operations across all themes;
- incremental rolling state;
- parallel sidecar uploads;
- no daily full-history recomputation.

### One-time backfill

Estimated one-time runtime:

- 5Y rolling attribution backfill: approximately 5–20 minutes
- 10Y rolling attribution backfill: approximately 15–45 minutes

The backfill should run manually or as a dedicated Cloud Run job. It must not be
part of the normal daily critical path.

Initial operational sequence:

```bash
cd FetchEODData
FACTOR_ATTRIBUTION_BACKFILL=1 python ThemeAnalysis_8_ThemeFactorAttribution.py
python publish_factor_attribution_sidecars.py
```

After the first backfill, the normal `run.py` sequence appends new attribution
days and republishes only changed sidecars. If the private daily attribution
artifact is missing, Fetch 8 exits successfully without starting an accidental
full-history backfill.

Optimized daily behavior:

- If the latest complete theme/factor date is already represented in the
  horizon artifact, Fetch 8 exits before downloading or rewriting the
  2.4-million-row daily attribution parquet.
- On a new trading date, only the new attribution date is calculated; the full
  daily parquet is rewritten only when rows actually changed.
- Cohesion is a slower-moving structural measure and defaults to a seven
  calendar-day refresh cadence. Daily runs reuse the last valid cohesion
  artifact.
- Override the cohesion cadence with
  `FACTOR_COHESION_REFRESH_DAYS=<days>`.
- Force an exceptional cohesion rebuild with
  `FACTOR_COHESION_FORCE_REFRESH=1`.
- Force attribution/horizon regeneration with
  `FACTOR_ATTRIBUTION_FORCE_REFRESH=1`.

### Prohibited daily implementation

Do not recalculate every rolling regression for every historical date on every
daily run. A naive full 10Y recomputation could add many minutes and create
unnecessary R2 reads/writes.

Daily processing should:

1. read the latest rolling state;
2. append new return observations;
3. update current rolling matrices/betas;
4. append one day of contributions;
5. refresh standard horizon summaries;
6. publish changed sidecars.

## Runtime instrumentation

Add explicit timers for:

- input download;
- factor construction;
- rolling-state update;
- contribution calculation;
- horizon aggregation;
- constituent cohesion;
- parquet write;
- sidecar serialization;
- changed/unchanged upload counts;
- CDN purge.

Log:

- themes processed;
- factors in the core model;
- horizons produced;
- themes missing 5Y/10Y coverage;
- average and maximum sidecar bytes;
- reconciliation failures;
- invalid or low-sample models;
- total runtime.

Do not mark the rollout complete until at least five production runs establish
real p50 and p95 timings.

## Site-performance verification

Before release, compare the build before and after the feature.

Required checks:

1. `npm run build`
2. `npm run verify:budgets`
3. Confirm theme HTML remains below 200 KB.
4. Confirm no attribution payload appears in exported theme HTML or RSC data.
5. Confirm the Factor Drivers JavaScript is a separate lazy chunk.
6. Confirm no attribution network request occurs before the tab is opened.
7. Confirm opening another existing tab does not load attribution code/data.
8. Measure compressed sidecar size for the largest theme.
9. Measure tab-open parse/render time on desktop and mobile throttling.
10. Confirm no new polling interval exists.

Release gates:

- Initial theme HTML increase: no more than 2 KB
- Initial route JavaScript increase: no more than 5 KB, with a target of 0 KB
- LCP regression: less than 100 ms in repeated controlled tests
- INP regression before opening the tab: none outside measurement noise
- Largest compressed attribution sidecar: below 25 KB target
- Tab-open render: below 100 ms main-thread target

If these gates fail, reduce payload fields or split attribution and cohesion
sidecars. Do not move the data back into server props.

## Testing requirements

### Mathematical tests

- Contributions plus theme-specific return reconcile to actual return.
- Day `t` contribution uses beta estimated through `t-1`.
- Growth/Value is represented once, not as two inverse factors.
- Missing factors do not silently change the core model without a version bump.
- Long-horizon geometric linking is correct.
- 10Y is omitted when coverage rules fail.

### Synthetic model tests

Generate themes with known factor betas and verify recovered contribution:

- pure market theme;
- market plus growth/value;
- negative rate sensitivity;
- zero factor exposure;
- large idiosyncratic shock;
- factor-regime change halfway through history.

### Cohesion tests

- A ticker is excluded from its own theme comparator.
- Manual weights renormalize correctly.
- Identical constituent returns produce near-one cohesion.
- Independent returns produce low cohesion.
- Market-adjusted correlation removes a shared SPY-only component.
- Two-ticker and missing-data themes degrade gracefully.

### Contract tests

- Validate the sidecar against its JSON schema.
- Parse missing optional horizons.
- Reject incompatible schema versions.
- Verify deterministic serialization.
- Verify payload size limits in CI.

## Rollout sequence

### Phase 1: Methodology hardening

- Collapse Growth and Value into one signed factor.
- Define the final core factor list.
- Separate narrative overlays.
- Add factor correlation and collinearity diagnostics.
- Lock methodology and factor-set versioning.

### Phase 2: Attribution engine

- Add look-ahead-safe rolling exposures.
- Add daily log-return contributions.
- Add reconciliation tests.
- Add incremental rolling state.
- Run 5Y and 10Y backfills.

### Phase 3: Constituent theme fit

- Build leave-one-out theme returns.
- Calculate raw and market-adjusted correlation.
- Calculate ticker theme beta/R-squared.
- Produce horizon cohesion summaries.

### Phase 4: Public contracts

- Add JSON schema and TypeScript types.
- Add per-theme sidecar builder.
- Add hash-gated parallel publishing.
- Enforce payload budgets.

### Phase 5: Lazy frontend

- Add protected Factor Drivers tab.
- Dynamically import the panel.
- Fetch only on tab activation.
- Add horizon synchronization.
- Add header explanations and methodological caveats.

### Phase 6: Validation and staged release

- Benchmark five production runs.
- Verify build and route budgets.
- Inspect representative cohesive and heterogeneous themes.
- Release theme attribution first.
- Consider individual-stock factor attribution only after the theme model is
  trusted.

## Final acceptance criteria

The feature is complete only when:

- factor contributions reconcile to actual theme return;
- daily calculations are look-ahead safe;
- 5Y works using rolling exposures;
- 10Y appears only with adequate coverage;
- narrative overlays are not double-counted;
- leave-one-out constituent correlation is correct;
- raw and market-adjusted cohesion are both available;
- typical added daily ETL time is under two minutes;
- the one-time backfill is not on the daily critical path;
- the initial theme page does not fetch attribution data;
- initial HTML and JavaScript budgets remain within limits;
- the largest sidecar remains within transfer budget;
- all headers explain meaning and interpretation;
- the UI calls residual return `theme-specific` or `unexplained`, not `alpha`.
