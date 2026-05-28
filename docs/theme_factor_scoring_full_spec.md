# Theme Factor Scoring Framework

## Purpose

You have hundreds or thousands of market narrative themes and want to understand what major forces are driving them. The goal is to assign each theme a set of intuitive factor scores that describe whether the theme behaves like:

- broad market beta
- momentum
- small-cap exposure
- growth / long-duration equities
- value / cyclicals
- quality / defensive equities
- speculative high beta
- falling-rate beneficiaries
- credit risk-on assets
- inflation / commodity beneficiaries
- strong-dollar beneficiaries
- specific sectors
- meme / retail speculation
- AI / innovation narratives
- crypto-linked risk appetite
- unprofitable growth

The output should be easy to refresh each morning for thousands of themes.

---

# Object storage (Cloudflare R2)

MosaicBot ETL and stockthemes.ai use **Cloudflare R2** (S3-compatible API via `FetchEODData/storage_compat.py`). Legacy docs may still say “GCS”; treat those as the same *role* (object storage), not the current provider.

| Bucket | Access | Typical objects | Consumers |
| --- | --- | --- | --- |
| **`mosaic-themes`** | Private (ETL + Dash) | `theme_daily_returns.parquet`, `historical_etf_data.parquet`, `theme_factor_scores_latest.parquet`, `theme_factor_summary_latest.parquet`, … | Cloud Run Fetch jobs, Dash, admin |
| **`stockthemes-public`** | Public (CDN) | `manifest.json`, `themes/<slug>.json`, `themes/<slug>.factor_profile.v0.json`, bundles | Browsers, CI build cache at **`https://storage.stockthemes.ai`** |

See **`docs/R2_MIGRATION.md`** for env vars (`R2_ENDPOINT_URL`, `MOSAIC_THEMES_BUCKET`, `STOCKTHEMES_PUBLIC_BUCKET`, `STOCKTHEMES_PUBLIC_BASE_URL`).

**Factor data split:** full factor matrix → **`mosaic-themes`** only; ~6 factors per theme (top ±3) → **`stockthemes-public`** sidecar, lazy-loaded on the site.

---

# Core Principle

For every factor:

```text
Higher score = more positive exposure to that factor.
Lower score = less exposure, or possibly opposite exposure.
```

Because of that, factor names should be directional and intuitive.

For example, use:

```text
Small-Cap Exposure Score
```

not simply:

```text
Size Score
```

A high **Small-Cap Exposure Score** means more small-cap exposure. A high **Mega-Cap Exposure Score** would mean the opposite.

---

# Recommended Factor Names

Use these names in the dashboard or output table:

```text
Market Beta Exposure
Momentum Exposure
Small-Cap Exposure
Growth / Duration Exposure
Value / Cyclical Exposure
Quality / Defensive Exposure
Speculative Beta Exposure
Falling-Rate Sensitivity
Credit Risk-On Sensitivity
Inflation / Commodity Sensitivity
Strong-Dollar Sensitivity
Sector-Specific Exposure
Meme / Retail Speculation Exposure
AI / Innovation Narrative Exposure
Crypto Sensitivity
Unprofitable Growth Exposure
```

---

# Scoring Interpretation

| Factor | Higher Score Means | Lower Score Means |
|---|---|---|
| Market Beta Exposure | Theme behaves like a high-beta equity basket and moves strongly with the broad market. | Defensive, low-beta, or market-insensitive. |
| Momentum Exposure | Theme has strong recent price momentum and/or behaves like other momentum winners. | Weak momentum, reversal behavior, or laggard behavior. |
| Small-Cap Exposure | Theme behaves like small caps or is structurally made up of smaller companies. | Large-cap or mega-cap dominated. |
| Growth / Duration Exposure | Theme behaves like long-duration growth stocks sensitive to future earnings and discount rates. | Value, near-term cash-flow, defensive, or old-economy tilted. |
| Value / Cyclical Exposure | Theme behaves like value/cyclical stocks, such as financials, industrials, energy, materials, and reflation beneficiaries. | Growth, defensive, or long-duration tilted. |
| Quality / Defensive Exposure | Theme behaves like profitable, stable, lower-volatility compounders. | More speculative, lower-quality, more volatile, or economically fragile. |
| Speculative Beta Exposure | Theme acts like risk-on, volatile, speculative equities. | Lower-volatility, steadier, more defensive. |
| Falling-Rate Sensitivity | Theme benefits when long-duration bonds rally and yields fall, assuming the factor uses TLT returns. | Benefits from rising rates, or is hurt when yields fall. |
| Credit Risk-On Sensitivity | Theme benefits when high-yield credit outperforms investment-grade credit. | Defensive or performs better when credit stress rises. |
| Inflation / Commodity Sensitivity | Theme benefits from commodity strength, inflationary pressure, energy/materials strength, or reflation. | Hurt by inflation/commodity strength, or more deflation/growth-duration exposed. |
| Strong-Dollar Sensitivity | Theme benefits when the U.S. dollar rises. | Theme benefits when the dollar weakens. |
| Sector-Specific Exposure | Theme has exposure to a sector beyond normal market beta. | Little exposure to that sector, or inverse sector-specific exposure. |
| Meme / Retail Speculation Exposure | Theme behaves like retail-driven, high-volatility, short-squeeze, social/speculative names. | Institutional, stable, less retail/speculative. |
| AI / Innovation Narrative Exposure | Theme has specific exposure to AI/innovation narratives beyond generic growth, beta, and momentum. | Little AI/innovation sensitivity after controlling for broader growth/risk appetite. |
| Crypto Sensitivity | Theme behaves like crypto-linked risk appetite. | Little crypto sensitivity, or anti-crypto/defensive behavior. |
| Unprofitable Growth Exposure | Theme behaves like long-duration, loss-making, concept-stock growth companies. | Profitable, cash-generative, value/quality/defensive. |

---

# Basic Return Notation

Use daily returns for all themes, ETFs, indexes, and custom baskets.

```text
R_X,t = daily return of ETF, index, stock, or basket X on day t
```

For a price series:

```text
R_X,t = Price_X,t / Price_X,t-1 - 1
```

For a theme:

```text
R_theme,t = theme_price_t / theme_price_t-1 - 1
```

For a factor spread:

```text
F_t = R_long_proxy,t - R_short_proxy,t
```

For a residualized factor:

```text
R_proxy,t = alpha + beta_1 * control_1,t + beta_2 * control_2,t + ... + error_t

F_residual,t = error_t
```

---

# Core Regression Model

For each theme, estimate exposure to each factor using rolling regressions.

```text
R_theme,t = alpha
          + beta_market              * F_MARKET,t
          + beta_momentum            * F_MOMENTUM,t
          + beta_small_cap           * F_SMALL_CAP,t
          + beta_growth_duration     * F_GROWTH_DURATION,t
          + beta_value_cyclical      * F_VALUE_CYCLICAL,t
          + beta_quality_defensive   * F_QUALITY_DEFENSIVE,t
          + beta_speculative_beta    * F_SPECULATIVE_BETA,t
          + beta_falling_rate        * F_FALLING_RATE,t
          + beta_credit_risk_on      * F_CREDIT_RISK_ON,t
          + beta_inflation_commodity * F_INFLATION_COMMODITY,t
          + beta_strong_dollar       * F_STRONG_DOLLAR,t
          + beta_sector_1            * F_SECTOR_1_RESIDUAL,t
          + ...
          + beta_meme_retail         * F_MEME_RETAIL,t
          + beta_ai_innovation       * F_AI_INNOVATION,t
          + beta_crypto              * F_CRYPTO,t
          + beta_unprof_growth       * F_UNPROFITABLE_GROWTH,t
          + error_t
```

For speed and cleaner interpretation, build this as a matrix regression across all themes rather than a separate loop for each theme.

---

# Rolling Windows

Calculate exposures across multiple windows:

```text
63 trading days
126 trading days
252 trading days
```

Then blend them:

```text
blended_beta = 50% * beta_63d
             + 30% * beta_126d
             + 20% * beta_252d
```

This makes the factor score responsive without being too noisy.

---

# Converting Betas to 0-100 Scores

For each factor, compare all themes to each other.

Use a robust z-score:

```text
z = (theme_beta - median_beta_across_themes) / MAD_beta_across_themes
```

Then convert to a score:

```text
score = clip(50 + 15 * z, 0, 100)
```

Interpretation:

| Score | Interpretation |
|---:|---|
| 90-100 | Very high exposure |
| 75-90 | Strong exposure |
| 60-75 | Moderate positive exposure |
| 40-60 | Neutral or mixed |
| 25-40 | Moderate negative exposure |
| 10-25 | Strong negative exposure |
| 0-10 | Very opposite exposure |

---

# Confidence Score

Every factor score should have a confidence score.

A simple version:

```text
confidence = 40% * t_stat_score
           + 30% * beta_stability_score
           + 30% * explanatory_power_score
```

Where:

```text
t_stat_score = min(abs(t_stat) / 3, 1)
```

```text
beta_stability_score = consistency of 63d, 126d, and 252d betas
```

```text
explanatory_power_score = factor or model R-squared contribution
```

Then confidence-adjust the score:

```text
adjusted_score = 50 + (raw_score - 50) * confidence
```

Example:

```text
raw Growth / Duration Score = 90
confidence = 0.75

adjusted score = 50 + (90 - 50) * 0.75
               = 80
```

This avoids false precision when the relationship is noisy.

---

# Factor Equations and ETF Proxies

## 1. Market Beta Exposure

**Purpose:** Measures broad equity-market sensitivity.

**ETF needed:**

```text
SPY
```

**Equation:**

```text
F_MARKET,t = R_SPY,t
```

**Regression interpretation:**

```text
Higher beta to SPY = higher Market Beta Exposure Score
```

**Higher score means:** More broad-market beta.

---

## 2. Momentum Exposure

**Purpose:** Measures whether the theme behaves like recent winners.

**ETFs needed:**

```text
MTUM
SPY
```

**Behavioral factor equation:**

```text
F_MOMENTUM,t = R_MTUM,t - R_SPY,t
```

This measures whether the theme outperforms when momentum stocks outperform the market.

**Direct theme momentum equation:**

```text
theme_12m_minus_1m_momentum = theme_price_t-21 / theme_price_t-252 - 1
```

This excludes the most recent month to avoid short-term reversal noise.

**Recommended final score:**

```text
Momentum Score = 50% * beta score to (MTUM - SPY)
               + 50% * own 12m-minus-1m momentum percentile
```

**Higher score means:** Stronger momentum / winner behavior.

---

## 3. Small-Cap Exposure

**Purpose:** Measures whether the theme is structurally small-cap or behaves like small caps.

**ETFs needed:**

```text
IWM
SPY
```

**Behavioral factor equation:**

```text
F_SMALL_CAP,t = R_IWM,t - R_SPY,t
```

This measures whether the theme works when small caps outperform large caps.

**Structural equation if constituents are available:**

```text
weighted_log_market_cap_theme = sum(weight_i * log(market_cap_i))
```

Invert it so higher = smaller:

```text
structural_small_cap_score = percentile_rank(-weighted_log_market_cap_theme)
```

**Recommended final score:**

```text
Small-Cap Exposure Score = 70% * structural small-cap score
                          + 30% * beta score to (IWM - SPY)
```

**Higher score means:** More small-cap / micro-cap exposure.

**Example:**

```text
MSFT should score very low.
POET should score very high.
```

---

## 4. Growth / Duration Exposure

**Purpose:** Measures long-duration growth sensitivity.

**Preferred ETFs:**

```text
IWF
IWD
```

**Alternative ETFs:**

```text
QQQ
SPY
```

**Preferred equation:**

```text
F_GROWTH_DURATION,t = R_IWF,t - R_IWD,t
```

**Alternative tech-heavy equation:**

```text
F_GROWTH_DURATION_ALT,t = R_QQQ,t - R_SPY,t
```

The `IWF - IWD` spread is a cleaner style factor. The `QQQ - SPY` spread is more Nasdaq/tech-heavy.

**Higher score means:** More growth / long-duration equity exposure.

---

## 5. Value / Cyclical Exposure

**Purpose:** Measures value, old-economy, cyclical, and reflation-style behavior.

**ETFs needed:**

```text
IWD
IWF
```

**Equation:**

```text
F_VALUE_CYCLICAL,t = R_IWD,t - R_IWF,t
```

**Alternative cyclical basket equation:**

```text
F_CYCLICAL,t = equal_weight(R_XLI,t, R_XLF,t, R_XLE,t, R_XLB,t) - R_SPY,t
```

**Higher score means:** More value / cyclical exposure.

---

## 6. Quality / Defensive Exposure

**Purpose:** Measures stable, profitable, lower-leverage, defensive compounder behavior.

**ETFs needed:**

```text
QUAL
SPY
```

**Equation:**

```text
F_QUALITY_DEFENSIVE,t = R_QUAL,t - R_SPY,t
```

**Optional more defensive equation:**

```text
F_QUALITY_DEFENSIVE_ALT,t = R_QUAL,t - R_SPHB,t
```

**Higher score means:** More quality / defensive exposure.

---

## 7. Speculative Beta Exposure

**Purpose:** Measures risk-on, volatile, speculative equity behavior.

**ETFs needed:**

```text
SPHB
SPLV
```

**Equation:**

```text
F_SPECULATIVE_BETA,t = R_SPHB,t - R_SPLV,t
```

**Alternative:**

```text
F_SPECULATIVE_BETA_ALT,t = R_SPHB,t - R_SPY,t
```

**Higher score means:** More high-beta / speculative equity exposure.

---

## 8. Falling-Rate Sensitivity

**Purpose:** Measures whether the theme benefits when long-duration bonds rally and yields fall.

**ETF needed:**

```text
TLT
```

**Equation:**

```text
F_FALLING_RATE,t = R_TLT,t
```

Since TLT generally rises when long-term yields fall, a high beta to TLT means the theme tends to like falling rates.

**Alternative using 10-year yield:**

```text
F_FALLING_RATE,t = -change_10Y_yield_t
```

**Higher score means:** More falling-rate sensitivity.

If you instead want a rising-rate score:

```text
F_RISING_RATE,t = -R_TLT,t
```

or:

```text
F_RISING_RATE,t = change_10Y_yield_t
```

---

## 9. Credit Risk-On Sensitivity

**Purpose:** Measures whether the theme benefits when credit risk appetite improves.

**ETFs needed:**

```text
HYG
LQD
```

**Equation:**

```text
F_CREDIT_RISK_ON,t = R_HYG,t - R_LQD,t
```

This measures whether the theme performs well when high-yield credit outperforms investment-grade credit.

**Higher score means:** More credit risk-on sensitivity.

---

## 10. Inflation / Commodity Sensitivity

**Purpose:** Measures whether the theme benefits from commodities, inflation, energy/materials strength, or reflation.

**ETF options:**

```text
DBC
XLE
XLB
GLD
CPER
USO
```

**Simple broad equation:**

```text
F_INFLATION_COMMODITY,t = R_DBC,t - R_SPY,t
```

**More equity-friendly blended equation:**

```text
F_INFLATION_COMMODITY,t = 50% * R_DBC,t
                            + 25% * (R_XLE,t - R_SPY,t)
                            + 25% * (R_XLB,t - R_SPY,t)
```

**Optional sub-factors:**

```text
Energy Sensitivity    = R_XLE,t - R_SPY,t
Materials Sensitivity = R_XLB,t - R_SPY,t
Gold Sensitivity      = R_GLD,t
Copper Sensitivity    = R_CPER,t
Oil Sensitivity       = R_USO,t
```

**Higher score means:** More inflation / commodity / reflation exposure.

---

## 11. Strong-Dollar Sensitivity

**Purpose:** Measures whether the theme benefits when the U.S. dollar strengthens.

**ETF needed:**

```text
UUP
```

**Equation:**

```text
F_STRONG_DOLLAR,t = R_UUP,t
```

**Higher score means:** More positive sensitivity to a stronger dollar.

If you want a weak-dollar score instead:

```text
F_WEAK_DOLLAR,t = -R_UUP,t
```

---

# Sector Residual Factors

Sector ETFs are highly correlated with the market. To get cleaner sector exposure, use residuals after removing market beta.

For any sector ETF:

```text
R_SECTOR,t = alpha + beta * R_SPY,t + error_t

F_SECTOR_RESIDUAL,t = error_t
```

Then regress theme returns against the sector residual factor.

**Higher sector residual score means:** The theme has exposure to that sector beyond normal broad market exposure.

## Sector ETF Map

| Sector | ETF | Factor Equation |
|---|---|---|
| Technology | XLK | residual of `R_XLK ~ R_SPY` |
| Communication Services | XLC | residual of `R_XLC ~ R_SPY` |
| Consumer Discretionary | XLY | residual of `R_XLY ~ R_SPY` |
| Industrials | XLI | residual of `R_XLI ~ R_SPY` |
| Financials | XLF | residual of `R_XLF ~ R_SPY` |
| Energy | XLE | residual of `R_XLE ~ R_SPY` |
| Materials | XLB | residual of `R_XLB ~ R_SPY` |
| Health Care | XLV | residual of `R_XLV ~ R_SPY` |
| Consumer Staples | XLP | residual of `R_XLP ~ R_SPY` |
| Utilities | XLU | residual of `R_XLU ~ R_SPY` |
| Real Estate | XLRE | residual of `R_XLRE ~ R_SPY` |

---

# Narrative / Speculation Factors

Narrative factors are often contaminated by market beta, growth, momentum, tech, and high beta. For this reason, they should usually be custom baskets and residualized.

---

## 12. Meme / Retail Speculation Exposure

**Best proxy:** Custom meme / retail speculation basket.

Possible ingredients:

```text
GME
AMC
CVNA
HOOD
PLTR
RDDT
DJT
MSTR
COIN
high short-interest names
high retail-ownership names
high options-volume names
```

**Raw basket equation:**

```text
R_MEME_RAW,t = equal_weight_return(custom_meme_stock_list)
```

**Clean factor equation:**

```text
R_MEME_RAW,t = alpha
             + b1 * R_SPY,t
             + b2 * F_SMALL_CAP,t
             + b3 * F_MOMENTUM,t
             + b4 * F_SPECULATIVE_BETA,t
             + error_t

F_MEME_RETAIL,t = error_t
```

**Higher score means:** More meme / retail / short-squeeze / social-speculation exposure.

---

## 13. AI / Innovation Narrative Exposure

**ETF options:**

```text
AIQ
THNQ
ARKK
SMH
BOTZ
```

**Best proxy:** Custom AI basket.

Potential AI basket layers:

```text
AI Infrastructure
AI Semiconductors
AI Power / Data Centers
AI Software
AI Apps
AI Services
```

**Raw basket equation:**

```text
R_AI_RAW,t = equal_weight_return(custom_AI_basket)
```

**Clean factor equation:**

```text
R_AI_RAW,t = alpha
           + b1 * R_SPY,t
           + b2 * F_GROWTH_DURATION,t
           + b3 * F_MOMENTUM,t
           + b4 * F_SPECULATIVE_BETA,t
           + b5 * F_TECH_RESIDUAL,t
           + error_t

F_AI_INNOVATION,t = error_t
```

**Higher score means:** More AI / innovation-specific narrative exposure after controlling for generic growth, tech, momentum, and beta.

---

## 14. Crypto Sensitivity

**Best proxy:** BTC return directly.

**ETF / stock alternatives:**

```text
IBIT
BITB
FBTC
COIN
MSTR
crypto miners basket
```

**Simple equation:**

```text
F_CRYPTO,t = R_BTC,t
```

or:

```text
F_CRYPTO,t = R_IBIT,t
```

**Cleaner raw basket equation:**

```text
R_CRYPTO_RAW,t = 50% * R_BTC,t
               + 25% * R_COIN,t
               + 25% * equal_weight_return(crypto_miners)
```

**Clean factor equation:**

```text
R_CRYPTO_RAW,t = alpha
               + b1 * R_SPY,t
               + b2 * F_GROWTH_DURATION,t
               + b3 * F_SPECULATIVE_BETA,t
               + error_t

F_CRYPTO,t = error_t
```

**Higher score means:** More crypto / digital-asset risk sensitivity.

---

## 15. Unprofitable Growth Exposure

**Purpose:** Measures exposure to concept stocks, future revenue, long-duration loss-making companies.

**ETF options:**

```text
ARKK
IPO
QQQ
IWF
```

**Best proxy:** Custom unprofitable growth basket.

Build the basket from companies with traits such as:

```text
negative EBITDA or negative net income
high sales growth
high EV/sales
high equity duration
low or negative free cash flow margin
```

**Raw basket equation:**

```text
R_UNPROF_GROWTH_RAW,t = equal_weight_return(custom_unprofitable_growth_basket)
```

**ETF fallback equation:**

```text
R_UNPROF_GROWTH_RAW,t = R_ARKK,t
```

**Clean factor equation:**

```text
R_UNPROF_GROWTH_RAW,t = alpha
                      + b1 * R_SPY,t
                      + b2 * F_GROWTH_DURATION,t
                      + b3 * F_SPECULATIVE_BETA,t
                      + b4 * F_FALLING_RATE,t
                      + error_t

F_UNPROFITABLE_GROWTH,t = error_t
```

**Higher score means:** More exposure to loss-making, long-duration, speculative growth.

---

# Condensed Production Factor Table

| Factor | Preferred Proxy | Equation |
|---|---|---|
| Market Beta | SPY | `R_SPY` |
| Momentum | MTUM, SPY | `R_MTUM - R_SPY` plus own `P_t-21 / P_t-252 - 1` |
| Small-Cap | IWM, SPY | `R_IWM - R_SPY` plus weighted market-cap score |
| Growth / Duration | IWF, IWD | `R_IWF - R_IWD` |
| Value / Cyclical | IWD, IWF | `R_IWD - R_IWF` |
| Quality / Defensive | QUAL, SPY | `R_QUAL - R_SPY` |
| Speculative Beta | SPHB, SPLV | `R_SPHB - R_SPLV` |
| Falling-Rate Sensitivity | TLT | `R_TLT` |
| Credit Risk-On | HYG, LQD | `R_HYG - R_LQD` |
| Inflation / Commodities | DBC, XLE, XLB | `R_DBC - R_SPY`, or blended commodity basket |
| Strong Dollar | UUP | `R_UUP` |
| Sector Residuals | XLK, XLC, XLY, XLI, XLF, XLE, XLB, XLV, XLP, XLU, XLRE | residual of `R_sector ~ R_SPY` |
| Meme / Retail | custom basket | residual after market, size, momentum, high beta |
| AI / Innovation | custom basket, AIQ, ARKK | residual after market, growth, momentum, high beta, tech |
| Crypto | BTC, IBIT, COIN, miners | residual after market, growth, high beta |
| Unprofitable Growth | custom basket, ARKK | residual after market, growth, high beta, rates |

---

# Minimum ETF / Asset Download List

For version 1, pull these daily:

```text
SPY
IWM
MTUM
IWF
IWD
QUAL
SPHB
SPLV
TLT
HYG
LQD
DBC
UUP
XLK
XLC
XLY
XLI
XLF
XLE
XLB
XLV
XLP
XLU
XLRE
ARKK
AIQ
IBIT
```

Optional additions:

```text
QQQ
SMH
BOTZ
THNQ
GLD
CPER
USO
COIN
MSTR
BTC
```

---

# Morning Update Architecture

The morning job should compute factors once, then score every theme in matrix form.

Do not loop through 1,000+ themes and run separate regressions if avoidable.

## Main Daily Steps

```text
1. Pull latest prices for themes, ETFs, indexes, and custom baskets.
2. Update adjusted close tables.
3. Compute daily returns.
4. Compute raw factor returns.
5. Residualize sector and narrative factors.
6. Build X matrix of factor returns.
7. Build Y matrix of theme returns.
8. Run matrix regression for 63d, 126d, and 252d windows.
9. Blend betas.
10. Convert betas to 0-100 scores.
11. Compute confidence scores.
12. Save today's snapshot.
13. Update dashboard tables.
```

---

# Data Tables

## `theme_returns`

| date | theme_id | theme_return |
|---|---:|---:|
| 2026-05-20 | AI_POWER_GRID | 0.012 |
| 2026-05-20 | NUCLEAR | -0.004 |

## `factor_returns`

| date | factor_id | factor_return |
|---|---:|---:|
| 2026-05-20 | MARKET | 0.006 |
| 2026-05-20 | GROWTH_DURATION | 0.011 |
| 2026-05-20 | SMALL_CAP | -0.002 |

## `theme_factor_scores`

| date | theme_id | factor_id | beta | score | confidence | window |
|---|---:|---:|---:|---:|---:|---:|
| 2026-05-20 | AI_POWER_GRID | GROWTH_DURATION | 1.24 | 91 | 84 | 252d |

## Recommended stored fields

For every theme-factor-date combination, store:

```text
date
theme_id
factor_id
beta_63d
beta_126d
beta_252d
blended_beta
raw_score
confidence
adjusted_score
t_stat
factor_contribution
model_r2
```

Also store a theme-level daily summary:

```text
date
theme_id
top_positive_factor_1
top_positive_factor_2
top_positive_factor_3
top_negative_factor_1
top_negative_factor_2
top_negative_factor_3
model_r2
idiosyncratic_score
dominant_factor_group
```

---

# Runtime Expectations

For roughly:

```text
1,000 themes
20-30 factors
63d, 126d, 252d windows
```

The actual scoring math should be fast.

| Step | Expected Runtime |
|---|---:|
| Load latest theme + factor returns | 1-10 seconds |
| Build return matrices | less than 1-3 seconds |
| Run 63d / 126d / 252d matrix regressions | less than 1-5 seconds |
| Convert betas to scores | less than 1 second |
| Write results to R2 (parquet) | 1-10 seconds |
| Full scoring job, excluding price/API pulls | 5-30 seconds |

Realistic total runtime:

```text
If prices are already updated: 10-45 seconds
If price/API pulls are included: 1-10+ minutes
If rebuilding all theme histories from constituents: 5-30+ minutes
```

Do not recompute full history every morning unless factor definitions, theme construction, or scoring methodology changed.

---

# Matrix Regression Approach

Let:

```text
Y = theme returns matrix
Shape: days x themes

X = factor returns matrix
Shape: days x factors
```

Then estimate betas for all themes at once:

```text
Betas = inverse(X'X) X'Y
```

Because factors can be correlated, use a small ridge penalty:

```text
Betas = inverse(X'X + lambda * I) X'Y
```

Start with:

```text
lambda = 1e-5 to 1e-3
```

Do not penalize the intercept.

---

# Python-Style Pseudocode

```python
import numpy as np
import pandas as pd

WINDOWS = {
    "63d": 0.50,
    "126d": 0.30,
    "252d": 0.20,
}


def calc_betas_matrix(theme_returns, factor_returns, window):
    """
    theme_returns: DataFrame indexed by date, columns = theme_id
    factor_returns: DataFrame indexed by date, columns = factor_id
    """

    y = theme_returns.tail(window).dropna(axis=1, how="any")
    x = factor_returns.loc[y.index].dropna(axis=0, how="any")
    y = y.loc[x.index]

    X = x.to_numpy()
    Y = y.to_numpy()

    # Add intercept
    X = np.column_stack([np.ones(len(X)), X])

    # Ridge stabilization
    ridge = 1e-5
    k = X.shape[1]
    penalty = ridge * np.eye(k)
    penalty[0, 0] = 0  # do not penalize intercept

    betas = np.linalg.solve(X.T @ X + penalty, X.T @ Y)

    beta_df = pd.DataFrame(
        betas[1:, :],
        index=x.columns,
        columns=y.columns,
    ).T

    return beta_df


def robust_score(beta_df):
    """
    beta_df: rows = themes, columns = factors
    """
    median = beta_df.median(axis=0)
    mad = (beta_df - median).abs().median(axis=0)
    z = (beta_df - median) / mad.replace(0, np.nan)

    scores = 50 + 15 * z
    scores = scores.clip(lower=0, upper=100)

    return scores


def daily_factor_scores(theme_returns, factor_returns):
    blended_betas = None

    for window_name, weight in WINDOWS.items():
        n = int(window_name.replace("d", ""))
        betas = calc_betas_matrix(theme_returns, factor_returns, n)

        if blended_betas is None:
            blended_betas = weight * betas
        else:
            blended_betas = blended_betas.add(weight * betas, fill_value=0)

    scores = robust_score(blended_betas)

    return blended_betas, scores
```

---

# Example: MSFT vs POET on Small-Cap Exposure

The Small-Cap Exposure Score should be defined so that:

```text
Higher score = more small-cap exposure
```

For the behavioral factor:

```text
F_SMALL_CAP,t = R_IWM,t - R_SPY,t
```

If a stock or theme has high positive beta to this factor, it tends to do well when small caps outperform large caps.

Expected result:

| Name | Structural Size | Expected Small-Cap Score |
|---|---|---:|
| MSFT | Mega-cap | 0-10 |
| POET | Small/micro-cap | 85-100 |
| SPY-like theme | Large-cap | 20-40 |
| Mid-cap industrial theme | Mid-cap | 45-65 |

If constituents are available, the structural score should dominate:

```text
Small-Cap Exposure Score = 70% * structural small-cap score
                          + 30% * behavioral small-cap beta score
```

This prevents a mega-cap stock from being incorrectly labeled as small-cap simply because it temporarily traded like risk-on equities.

---

# Dashboard Views

## 1. Theme Factor Profile

For one selected theme:

| Factor | Score | Confidence | 63d Beta | 252d Beta |
|---|---:|---:|---:|---:|
| Growth / Duration | 88 | 79 | 1.42 | 0.97 |
| Momentum | 81 | 74 | 0.88 | 0.61 |
| Falling-Rate Sensitivity | 76 | 68 | 0.54 | 0.39 |

## 2. Factor Leaderboard

For each factor, show the most exposed themes:

| Factor | Top Themes |
|---|---|
| Meme / Retail | Theme A, Theme B, Theme C |
| Falling-Rate Sensitivity | Theme D, Theme E, Theme F |
| AI / Innovation | Theme G, Theme H, Theme I |

## 3. Theme Clustering

Cluster themes based on their adjusted factor scores.

This will reveal when many narratives are actually the same underlying trade.

Examples:

```text
High beta + growth + falling rates + AI / innovation
```

or:

```text
Small-cap + industrials + inflation + fiscal spending
```

---

# Suggested Implementation Roadmap

## Version 1: Fast ETF-Based Model

Use ETF and index proxies only.

Build:

```text
market beta
momentum
small-cap
growth / duration
value / cyclical
quality / defensive
speculative beta
rates
credit
inflation / commodities
dollar
sector residuals
AI / innovation via ETF or simple basket
crypto via BTC or IBIT
unprofitable growth via ARKK
```

This is the fastest path to a useful morning dashboard.

## Version 2: Add Custom Baskets

Replace weak ETF proxies with custom baskets:

```text
meme / retail basket
AI basket
crypto equity basket
unprofitable growth basket
cyclical basket
commodity beneficiary basket
```

Residualize these baskets so they do not simply duplicate market, growth, momentum, or high beta.

## Version 3: Add Constituent-Level Scores

If you have theme constituents, add structural scores:

```text
weighted market cap
weighted sector exposure
weighted sales growth
weighted EBITDA margin
weighted free cash flow margin
weighted valuation
weighted short interest
weighted revision momentum
weighted profitability
```

Then blend structural and behavioral scores.

Examples:

```text
Final Small-Cap Score = 70% * structural small-cap score
                      + 30% * behavioral small-cap beta score
```

```text
Final Growth Score = 50% * beta to growth/duration factor
                   + 50% * constituent sales-growth / valuation-duration score
```

## Version 4: Theme Clustering and Alerts

Use daily factor scores to cluster themes and generate alerts:

```text
Themes becoming more speculative
Themes becoming more rate-sensitive
Themes whose AI score is rising
Themes whose factor R-squared is falling
Themes with high idiosyncratic return behavior
Themes that are secretly the same trade
```

---

# Final Recommended Setup

Use this factor structure:

```text
Market
Momentum
Small-Cap
Growth / Duration
Value / Cyclical
Quality / Defensive
Speculative Beta
Falling Rates
Credit Risk-On
Inflation / Commodities
Strong Dollar
Sector Residuals
Meme / Retail
AI / Innovation
Crypto
Unprofitable Growth
```

Compute scores daily using:

```text
1. Daily factor returns
2. Rolling matrix regressions
3. 63d / 126d / 252d blended betas
4. Robust z-score conversion to 0-100
5. Confidence adjustment
6. Daily saved score snapshots
```

The highest-value output is not just a score. It is an interpretation like:

```text
This theme is 91st percentile Growth / Duration,
84th percentile Speculative Beta,
79th percentile Falling-Rate Sensitivity,
and 76th percentile AI / Innovation.

Model R-squared is 68%, meaning most of the recent move is explained by standard factor behavior rather than pure theme-specific alpha.
```

---

# Qualifications, issues, and concerns

Read this before building. Factor scoring is mostly **offline ETL**; the risk to stockthemes.ai is **what you publish** to **`stockthemes-public`** and **how the Next.js app loads it**, not the regression math itself.

## Data and methodology

| Topic | Concern | Mitigation |
| --- | --- | --- |
| **Aggregation mismatch** | Theme returns differ by method (`manual_theme_weights`, `Average`, mcap-weighted). Scores trained on Average but shown next to manual-weight charts will confuse users. | Pick **one canonical aggregation** (recommend `manual_theme_weights` — same as `STOCKTHEMES_CHART_AGGREGATION` / public charts). Document it on every output. |
| **Return units** | Fetch5 `create_daily_returns()` stores `return_pct` (e.g. `1.2` = 1.2%). Spec regression uses **decimal** returns. | Convert at ETL boundary: `r = return_pct / 100`. |
| **Short themes** | Fetch5 inverts `Short 'XX` themes for correlations only. | Apply the **same sign rule** to factor regressions or short baskets will look “long beta”. |
| **Thin / new themes** | &lt; ~60 trading days → unstable betas and nonsense percentiles. | Minimum history gate; emit `confidence` and shrink scores toward 50; omit or gray out UI when confidence &lt; threshold. |
| **Collinearity** | 20–30 correlated factors in one `X` matrix → unstable betas. | Ridge penalty (spec); consider **staged** regression (macro/style first, sector residuals second) if t-stats stay weak. |
| **Sector factors** | 11 sector residuals + macro factors → wide `X`, heavy JSON if all exposed. | Store all 11 internally; **public summary** = dominant sector only (max \|beta\| or score). |
| **ETF proxy quality** | `ARKK` ≠ “unprofitable growth”; `QQQ` ≠ pure growth/duration. | v1 = ETF proxies with clear caveats; v2 = residualized custom baskets. |
| **Narrative factors** | Meme / AI / crypto overlap market beta, growth, momentum, high beta. | Residualize custom baskets (spec); do not ship raw basket betas as “AI exposure” without controls. |
| **Structural vs behavioral** | Mega-cap name can spike on risk-on days and look “small cap” behaviorally. | v3 blend (70/30 small-cap); v1 behavioral only is acceptable if labeled. |
| **Look-ahead / refresh** | Using today’s partial return in 252d window. | Use **completed trading days** only; align theme and factor calendars (inner join). |

## Operational / ETL

| Topic | Concern | Mitigation |
| --- | --- | --- |
| **ETF universe gap** | Fetch3 / intraday only pull ~16 ETFs today; spec v1 needs ~25+. | Extend `etfs` in `ThemeAnalysis_3`, `ETF_TICKERS` in `etl_intraday_snapshot.py`, and Compare ETF lists **in sync**. |
| **Daily returns not persisted** | Fetch5 builds `daily_returns` in memory but does not write `theme_daily_returns.parquet`. | Persist once in Fetch5 or Fetch7 to avoid recomputing from aggregations. |
| **Pipeline order** | Manifest currently runs **before** Fetch5 in `run.py`. | Run factor job **after** Fetch5; run manifest **after** factor merge (or second manifest pass). |
| **Nightly runtime** | Matrix regression is cheap (~seconds); ETF backfill is not. | Do not rebuild multi-year history daily; append latest day to `factor_returns_daily` / scores snapshot. |
| **Cloud Run memory** | Loading full mcap history in Fetch5 is already heavy. | Fetch7 reads **parquet slices** (daily returns + ETF history), not full ticker history. |

## Product / interpretation

- Scores are **relative ranks across themes** (MAD z-score), not absolute “this theme IS growth.” A score of 80 means “high vs other themes lately,” not a fundamental label.
- High `model_r2` = returns explained by factors; **low** `model_r2` can be interesting (idiosyncratic narrative).
- Confidence-adjusted scores exist to avoid false precision — **show confidence** in UI when you show scores.

---

# Stockthemes.ai — performance guardrails (do not slow the site)

**Goal:** Factor scoring must not increase **first paint**, **static build time**, or **R2 origin / CDN transfer** in a meaningful way.

### What makes the site slow today (avoid repeating)

- Each `/themes/[slug]` static page loads **one** `themes/<slug>.json` at build time (`getThemeDetailCached` → `loadThemeDetail`).
- That JSON is already large: `constituents[]`, `chart_1y`, `compare_returns`, optional `composition_indexed`, `theme_thesis`, `rank_10d`.
- CI uses `scripts/sync-build-cache.mjs`: theme JSON is re-downloaded only when **object ETag/md5 changes** (R2 credentials in GitHub Actions; see `docs/R2_MIGRATION.md`).
- Homepage avoids N theme fetches via **`home_trending.v0.json`**, **`compare_themes.v0.json`**, **`home_top_movers.v0.json`** bundles.
- Public JSON is served from **`https://storage.stockthemes.ai`** (R2 custom domain + Cloudflare cache).

### Rules (required for v1 public site)

| Rule | Why |
| --- | --- |
| **Do not put full factor matrices in `themes/<slug>.json`** | 16 factors × (score, confidence, 3 betas) ≈ **2–4 KB/theme** × 1,000 themes → larger every page load + build cache churn when scores update daily. |
| **Prefer a sidecar file** | `themes/<slug>.factor_profile.v0.json` (~300–600 bytes): `as_of`, `model_r2`, top ±3 factors, optional `dominant_sector`. Load only when user opens a “Factor profile” section (`DeferRender` / client fetch). **Main theme JSON unchanged** when only factors refresh → md5 skip + faster CI. |
| **If embedding in main JSON, cap payload** | Max: `model_r2` + **top 3 positive** + **top 3 negative** (id, label, score, confidence). **No** full beta grids on the public object. |
| **Do not add factors to `manifest.json`** | Manifest is fetched on every route; keep it lean. |
| **Do not add factors to `home_trending` / `compare_themes` unless required** | Those bundles are downloaded on home/compare; keep optional for v2. |
| **Leaderboards = one bundle** | e.g. `factor_leaderboards.v0.json` (top themes per factor). One HTTP request for a dedicated page — not scanning all theme JSONs client-side. |
| **Keep full scores in private R2 only** | `mosaic-themes/theme_factor_scores_latest.parquet` (and history). Dash / ETL read private bucket; public site reads summary/sidecar from `stockthemes-public` only. |
| **Use `_upload_json_if_changed`** | MosaicBot manifest already skips byte-identical uploads; sidecars get their own path so constituent/compare updates do not force factor re-downloads. |
| **Do not tie `manifest.as_of` to factor-only updates** | Bumping manifest `as_of` for factor-only runs can widen CI “what changed” behavior. Put `factor_profile.as_of` inside the sidecar/summary artifact. |
| **No extra request on initial theme page load (v1)** | Default: sidecar loaded **after** hero/chart (lazy). User-perceived speed unchanged. |

### Acceptable costs

| Item | Expected impact |
| --- | --- |
| Nightly Fetch7 job | +10–45 s on Cloud Run (no user-facing latency). |
| ~1,000 small sidecar uploads/day | Only changed sidecars hit CDN; browser cache + `stockthemesBrowserFetchCache` (2h bucket) apply if you hydrate client-side. |
| Optional compact embed in main JSON | +~400 B/theme → acceptable **only** if you accept daily md5 churn when scores move. |
| Dash / MosaicBot internal | Full parquet + tables — no stockthemes impact. |

### Anti-patterns (reject in review)

- Loading `theme_factor_scores_latest.parquet` from the browser or GitHub Actions build.
- Adding 16 factor columns to `compare_themes.v0.json` by default.
- Second synchronous fetch in `generateMetadata` / above-the-fold server render without `DeferRender`.
- Putting factor history time series in public JSON (use private parquet + Dash).

---

# Implementation checklist

Use this as the execution order. Check off in PRs. Repo paths refer to **MosaicBotMain** (`FetchEODData/`, `utils/`) and **mosaicbot_stockthemes** (`src/`, `docs/`).

## Phase 0 — Decisions ✅ (locked 2026-05-27)

Proceed to Phase 1 unless you explicitly override an item below.

| # | Decision | Choice | Rationale |
| --- | --- | --- | --- |
| 1 | **Canonical aggregation** | `manual_theme_weights` | Matches `STOCKTHEMES_CHART_AGGREGATION` default and public `chart_1y` / compare tables. Factor ETL filters `theme_daily_returns` to this `agg_type` only. |
| 2 | **Public delivery (stockthemes)** | **Sidecar** `themes/<slug>.factor_profile.v0.json` + **lazy client fetch** (`DeferRender`) | Main `themes/<slug>.json` unchanged when only scores refresh → md5 skip, no build-cache churn, no extra bytes on first paint. |
| 3 | **Short-theme sign** | **Yes** — invert daily returns for themes matching Fetch5 `Short 'XX` pattern | Same semantics as correlation ETL (`_apply_short_theme_inversion_for_correlations`). |
| 4 | **v1 factor set** | **ETF / index proxies only** (spec “Minimum ETF Download List” + sector residuals) | Custom meme/AI/crypto baskets deferred to v2 with residualization. |
| 5 | **Sector on public site** | **Dominant sector only** in sidecar (`id`, `label`, `score`, `confidence`) | All 11 sector betas in private `theme_factor_scores_latest.parquet` only. |
| 6 | **UI confidence gate** | Hide or gray factor panel when theme-level `confidence` &lt; **0.35** (tune in Phase 3) | Thin-history themes should not show false precision. |
| 7 | **Dash / internal** | Full long parquet + optional compact embed later | No stockthemes impact. |

**ETL constants (use in Fetch7 / manifest):**

```text
FACTOR_AGG_TYPE              = manual_theme_weights   # maps to sym_theme / daily_values naming in ETL
FACTOR_PUBLIC_SIDECAR_SUFFIX = .factor_profile.v0.json
FACTOR_PUBLIC_BUNDLE         = factor_leaderboards.v0.json   # Phase 2 optional page
FACTOR_MIN_TRADING_DAYS      = 60
FACTOR_CONFIDENCE_UI_FLOOR   = 0.35
```

**Explicitly not in v1 public JSON:** full 16×factor grids, beta matrices, factor history series, manifest/home/compare bundle fields.

**Phase 0 checklist**

- [x] Canonical aggregation
- [x] Public delivery model
- [x] Short-theme sign
- [x] v1 factor scope
- [x] Sector public surface
- [x] Confidence UI floor (default)

## Phase 1 — Data foundation (MosaicBot ETL)

### 1.1 Expand ETF downloads

- [x] Add v1 tickers to `FetchEODData/ThemeAnalysis_3_FetchEODData_MarketCap.py` `etfs` list:  
  `MTUM`, `IWF`, `IWD`, `QUAL`, `SPHB`, `SPLV`, `TLT`, `HYG`, `LQD`, `DBC`, `UUP`, `AIQ`, `IBIT` (and any v1 sector gaps).
- [x] Mirror list in `etl_intraday_snapshot.py` `ETF_TICKERS`.
- [x] Mirror in Dash Compare Performance `ETF_TICKERS` and Stock Lens `_COMPARE_ETF_TICKERS`.
- [ ] Run Fetch3 once to backfill `historical_etf_data.parquet` on **`mosaic-themes`**.

### 1.2 Persist theme daily returns

- [x] In `ThemeAnalysis_5_FetchEODData_ThemeCorrelations.py` after `create_daily_returns()`, write  
  `theme_daily_returns.parquet` to **`mosaic-themes`** with columns: `date`, `theme`, `agg_type`, `return` (decimal).
- [x] Include **only** `manual_theme_weights` (replaces Fetch5 Weighted Average + Average passes for speed). Chart index via `theme_weighting.build_stockthemes_chart_index_wide`; short-theme inversion on save + correlations. Fetch7 filters `agg_type == manual_theme_weights`.
- [ ] Run Fetch5 once to populate `theme_daily_returns.parquet` on R2.

### 1.3 New job `ThemeAnalysis_7_ThemeFactorScores.py`

- [ ] Create module under `FetchEODData/`:
  - Load `theme_daily_returns.parquet` + `historical_etf_data.parquet` from **`mosaic-themes`**.
  - Build `factor_returns_daily.parquet` (`date`, `factor_id`, `return`) → **`mosaic-themes`**.
  - Residualize sector ETFs vs `SPY` → sector residual return series.
  - Ridge matrix regression for windows 63 / 126 / 252; blend 50/30/20.
  - Cross-sectional MAD z-score → 0–100; confidence shrink toward 50.
  - Write `theme_factor_scores_latest.parquet` (long: theme × factor × metrics) → **`mosaic-themes`**.
  - Write `theme_factor_summary_latest.parquet` (one row per theme: top ±3, `model_r2`, `dominant_sector`, `factor_as_of`) → **`mosaic-themes`**.
- [ ] Unit smoke: MSFT-like mega-cap theme low small-cap; POET-like theme high small-cap (sanity).

### 1.4 Wire pipeline

- [ ] Add `ThemeAnalysis_7_ThemeFactorScores.py` to `FetchEODData/run.py` **after** `ThemeAnalysis_5_FetchEODData_ThemeCorrelations.py`.
- [ ] Move `stockthemes_manifest.py` to **after** Fetch7 (or add manifest factor merge step post-Fetch7).
- [ ] Document env vars (if any) in `CLAUDE.md` / deploy-etl workflow.

## Phase 2 — Public publish (MosaicBot manifest → R2)

- [ ] Read `theme_factor_summary_latest.parquet` from **`mosaic-themes`** in `stockthemes_manifest.py`.
- [ ] For each theme, build compact `factor_profile` object (top ±3, `model_r2`, `as_of`).
- [ ] **Recommended:** upload `themes/<slug>.factor_profile.v0.json` to **`stockthemes-public`** via `_upload_json_if_changed` (separate from main theme JSON).
- [ ] **Optional:** merge compact block into `themes/<slug>.json` on **`stockthemes-public`** (only if product requires zero extra click).
- [ ] Add `factor_leaderboards.v0.json` bundle to **`stockthemes-public`** (top N themes per factor) — single public object.
- [ ] Update `docs/stockthemes/schemas/theme.detail.v0.schema.json` in MosaicBot (`factor_profile` optional).
- [ ] Do **not** add factor fields to `manifest.json` required keys.

## Phase 3 — stockthemes.ai (Next.js)

- [ ] Extend `src/types/theme.detail.v0.ts` with optional `factor_profile` (or new type for sidecar).
- [ ] Add `loadThemeFactorProfile.ts` + browser cache (same pattern as `stockthemesBrowserFetchCache`).
- [ ] UI: `ThemeFactorProfile` panel on `/themes/[slug]`, wrapped in `DeferRender` — **no** server-side fetch in `generateMetadata`.
- [ ] Do **not** add sidecar to `sync-build-cache.mjs` BUNDLE_FILES unless you need SSG of factor UI (default: client lazy load only → **no build impact**).
- [ ] Optional v2 page: `/factors` reading `factor_leaderboards.v0.json` only.

## Phase 4 — Dash / internal (MosaicBot)

- [ ] Load `theme_factor_scores_latest.parquet` in `utils/data_loader.py` or Theme Deep Dive.
- [ ] Theme factor profile table + factor leaderboard view (private app; full detail OK).

## Phase 5 — v2+ (later)

- [ ] Custom residualized baskets (meme, AI, crypto, unprofitable growth).
- [ ] Structural blends from constituents (mcap, margins, growth from Fetch2).
- [ ] History partitions `theme_factor_scores_history/date=…` + drift alerts.
- [ ] Clustering on factor vectors (“same trade” detection).

## Verification (stockthemes performance)

Before merging public publish:

- [ ] Measure `themes/<slug>.json` byte size **before/after** (embed path only): target **&lt; +500 bytes** if embedded.
- [ ] Confirm theme page Network tab: **no new request** until factor panel visible (sidecar path).
- [ ] Run `npm run build` with static pages: build time delta documented (expect ~0 if sidecar not in sync-build-cache).
- [ ] After ETL, confirm unchanged themes still log `skipped` in manifest upload when only unrelated fields stable.
- [ ] After launch, spot-check R2/Cloudflare analytics (class A/B ops, cache hit rate) if public sidecar traffic is non-trivial; see `docs/R2_MIGRATION.md`.

---

# Suggested Implementation Roadmap (versions)

