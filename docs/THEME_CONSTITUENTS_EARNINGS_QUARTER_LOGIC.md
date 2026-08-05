# Theme Constituents Earnings Quarter Logic

This defines earnings columns on `/themes/[slug]` constituent rows for stockthemes.ai.

## Quarter Buckets (ET)

- Q1: April, May, June
- Q2: July, August, September
- Q3: October, November, December
- Q4: January, February, March
- Quarter reset happens at `00:00 ET` on first day of the next bucket.

## Time Rules (ET)

- `BMO` on today: treated as reported starting market open (`09:30 ET`).
- `AMC` on today: treated as not yet reported during market hours.
- Prior-date reports are treated as reported.
- LstRpt lock window:
  - pre anchor: report day for `AMC`, prior day for `BMO`
  - post anchor: pre anchor + 2 calendar days
  - before post anchor is available in market data, EarningsPerf stays provisional.

## Display Columns

- `Qtr Earnings Date`
  - Uses current-quarter report date if available (last or next, by quarter bucket).
  - Appends timing marker `(BMO)` or `(AMC)`.
  - If no current-quarter report date exists, uses fallback date:
    - Q1 -> `04/25`
    - Q2 -> `07/25`
    - Q3 -> `10/25`
    - Q4 -> `01/25`
- `EarningsPerf`
  - When current-quarter report is effective:
    - provisional: show `last_rpt_live_percent` (current vs pre-report)
    - locked: show `last_rpt_final_percent` (or `last_rpt_percent`)
  - Else: blank (`—`).
- `Avg Abs Rpt %`
  - Rolling 16-quarter mean of absolute earnings-day moves (`avg_abs_rpt_percent`).
  - Expected move size for the ticker (always non-negative).
- `IntraQtr%`
  - When reported: show `pre_earnings_percent_last_report`.
  - When not yet reported: show `since_last_rpt_percent` (run-up from prior report to now).
- `Since Qtr Rpt%`
  - When reported: show `since_last_rpt_percent`.
  - When not yet reported: blank (`—`).

## Data Fields Required Per Constituent

From theme detail payload:

- `last_report_date`
- `next_report_date`
- `last_before_after_market`
- `next_before_after_market`
- `last_rpt_percent`
- `since_last_rpt_percent`
- `pre_earnings_percent_last_report`
- `earnings_percent_last_report` (kept for future use)
- `avg_abs_rpt_percent`
- `last_rpt_live_percent`
- `last_rpt_final_percent`
- `last_rpt_is_final`

## ETL Sources

- `business_info.csv` for report dates and `before_after_market`.
- `ticker_earnings_metrics.parquet` for `last_rpt` and `since_last_rpt`.
- `earnings_with_estimates_and_fundamentals_enriched_latest.parquet` for `PreEarnings%` / `Earnings%`.
- `earnings_dates_history.parquet` for `AvgAbsEarnings%_16Q` → `avg_abs_rpt_percent` (decimal × 100).
