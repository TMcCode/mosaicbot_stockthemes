# Auth & watchlist — implementation plan (stockthemes.ai)

Living checklist for sign-in, free watchlists, and the `/my` performance table.  
Canonical product context: **MosaicBot** `docs/STOCKTHEMES_AI_SPEC.md`.  
Related (Dash / paid later): **MosaicBot** `docs/MULTI_USER_AUTH_BILLING_PLAN.md`.

---

## Outside the codebase (manual / console / ops)

Use this section when you are **not** editing repos — dashboards, DNS, deploy config, legal copy, and running ETL in production.

### Supabase (supabase.com dashboard)

- [ ] Create organization + project (note **project URL** and **anon public key**)
- [ ] Pick region (e.g. `us-east-1` — hard to change later)
- [ ] **Authentication → Providers → Email:** enable Email; enable **Magic link** (disable password if unused)
- [ ] **Authentication → Email:** choose templates (optional: customize “Confirm signup” / “Magic link” copy and branding)
- [ ] **Authentication → URL configuration:**
  - Site URL: `https://stockthemes.ai`
  - Redirect URLs: `https://stockthemes.ai/**`, `http://localhost:3000/**` (and `http://127.0.0.1:3000/**` if you use it)
  - If you still test on GitHub project Pages, add that origin too (e.g. `https://<user>.github.io/mosaicbot_stockthemes/**`)
- [ ] **Authentication → Settings:** require email confirmation if you want verified emails before watchlist saves
- [ ] **SQL Editor:** run schema + RLS policies from [Schema (v1)](#schema-v1) below (or paste from a committed `supabase/migrations/*.sql` once you add one)
- [ ] **Database → Extensions:** none required for v1 beyond defaults
- [ ] **Project Settings → API:** copy `URL` + `anon` key into secrets (never commit **service_role** to the frontend)
- [ ] Optional: **Authentication → SMTP** custom domain so magic-link emails come from `@stockthemes.ai` (otherwise Supabase’s default sender is fine for low volume)
- [ ] Optional: **Auth → Rate limits** review before any public launch post
- [ ] Billing: confirm free tier limits (MAU, DB size) are acceptable for early traffic

### GitHub (`mosaicbot_stockthemes` repo)

- [ ] **Settings → Secrets and variables → Actions → Variables** (all `NEXT_PUBLIC_*` — safe in variables, not secrets):
  - Existing: `NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL`, `NEXT_PUBLIC_SITE_URL`, base path if used
  - New: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Newsletter: `NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_FORM_URL` (or LIGHT/DARK pair)
- [ ] Do **not** put Supabase **service_role** in Actions for the static site build
- [ ] After first auth deploy: run **Actions** deploy to Pages and smoke-test production sign-in

### Beehiiv (beehiiv.com)

- [ ] Publication already exists for “Den of Themes” (or create one)
- [ ] **Subscribe form:** create embed form(s) in Beehiiv UI; copy embed URLs into GitHub Actions variables (see [Newsletter](#newsletter-static-github-pages))
- [ ] Optional: light/dark (and mobile) form variants to match site theme
- [ ] No API key needed for production if iframe-only

### Google Cloud / ETL (MosaicBot — not the Next repo)

- [ ] **`compare_themes.v0.json`** already on `stockthemes-public` — no action for theme tab beyond normal ETL schedule
- [ ] When ready for ticker tab: run/deploy **FetchEODData** Cloud Run job so new **`compare_tickers.v0.json`** uploads (same bucket as manifest)
- [ ] Confirm `STOCKTHEMES_PUBLIC_BUCKET=stockthemes-public` on the ETL job (existing deploy-etl workflow)
- [ ] Optional: spot-check new JSON at `https://data.stockthemes.ai/compare_tickers.v0.json` after a run

### Cloudflare / domain (likely no change for v1 auth)

- [ ] Magic links and Supabase API calls go to **Supabase’s domain**, not your Worker — no Worker change required for sign-in
- [ ] CDN for `data.stockthemes.ai` unchanged (`docs/CLOUDFLARE_CDN_SETUP.md`)

### Legal / trust (recommended before promoting sign-in)

- [ ] Update **Privacy policy** (`/privacy`): account data stored in Supabase (email, watchlist), retention, delete account
- [ ] Update **Terms** if needed: accounts are free; no investment advice unchanged
- [ ] Optional: one line on `/sign-in` linking to privacy policy

### PostHog (optional, console)

- [x] Events in app: `sign_in`, `watchlist_add`, `my_view`, `account_view`, `theme_idea_submitted`
- [ ] Create funnel in PostHog UI — see **`docs/POSTHOG_AUTH_FUNNEL.md`**

### Later — paid tier (not v1)

- [ ] Stripe account + products/prices
- [ ] Stripe webhook endpoint (needs server or Supabase Edge Function — not GitHub Pages alone)
- [ ] Customer portal link in account settings

---

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| **Cost** | Everything free for now; paid tier later on same accounts |
| **Hosting** | GitHub Pages + `output: 'export'` + **Supabase** (browser client + RLS) |
| **Product scope** | stockthemes watchlist only — **not** MosaicBot Dash |
| **Public content** | All theme/group (and future stock) pages stay public |
| **Watchlist** | Sign-in required; max **20 themes** per user (**ticker saves deferred** until `/stocks/[ticker]`) |
| **Newsletter** | **Beehiiv iframe** on production (no API route on Pages) |
| **v1 personalized UI** | `/my` theme performance table; links to public theme pages |

---

## Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/sign-in` | Public | Magic link (Supabase Auth) |
| `/my` | Signed in | Theme watchlist performance table |
| `/my` | Anonymous | CTA: sign in to save a watchlist |
| `/themes/[slug]`, `/groups/...` | Public | Unchanged + **★ Save to watchlist** when signed in |
| `/stocks/[ticker]` | Public | Stock lens (after ETL publishes stock JSON) |
| `/compare` | Public | Unchanged; optional “save selection” later |

No separate `/my/stocks/...` or `/my/themes/...` in v1 — link from `/my` to public pages.

---

## `/my` table (v1)

### UX

- [ ] Toggle: **Themes** | **Tickers** (one table, flipped row set)
- [ ] Sortable columns (reuse patterns from `CompareThemesTable`)
- [ ] Row actions: remove from watchlist; name links to `/themes/[slug]` or `/stocks/[ticker]`
- [ ] Empty state + link to browse themes / search tickers
- [ ] Show `as_of` from compare JSON when available

### Columns (match homepage / compare)

Standard (from `compare_returns` / Theme Compare parquet):

- [ ] 1D %
- [ ] 10D %
- [ ] MTD %
- [ ] YTD %
- [ ] 1Yr % (`Period` in ETL)
- [ ] LstRpt %
- [ ] Since LstRpt %

Custom event columns (from ETL **SelectedDates**, e.g. configured in MosaicBot):

- [ ] IRANWAR % (footnote: long name from manifest / homepage pattern)
- [ ] LIBDAY %
- [ ] Any additional SelectedDates keys present in `compare_returns.columns` (dynamic tail after standard columns)

**Note:** Theme rows use **theme-index** compare stats (same as homepage trending), not a simple average of constituents.

### Data sources

| Tab | Source | Status |
|-----|--------|--------|
| Themes | `compare_themes.v0.json` on CDN — filter rows to watched slugs | **Exists** (`/compare` already loads this) |
| Tickers | `compare_tickers.v0.json` (new ETL export from `ticker_performance_latest.parquet`) | **Not yet published** |

Client flow for `/my`:

1. Load watchlist from Supabase (`watchlist_items`).
2. Fetch one compare bundle from `data.stockthemes.ai`.
3. Join watched keys → table rows via `valueForTrendingColumn` / `trendingCompareMetrics.ts`.

Until `compare_tickers.v0.json` ships: ticker tab shows stub copy or limited columns (do not block theme tab).

---

## Newsletter (static GitHub Pages)

Production must use **Beehiiv embed**, not the Next API route.

- [ ] Set GitHub Actions variables (see `.env.local.example`):
  - `NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_FORM_URL`, **or**
  - `NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_FORM_URL_LIGHT` + `_DARK`
- [ ] Confirm CI sets `STOCKTHEMES_STATIC_PAGES=1` (API signup disabled — already in `deploy-pages.yml`)
- [ ] Do **not** depend on `BEEHIIV_API_KEY` in Pages deploy
- [ ] Local dev: iframe works; API mode optional only without embed URLs

Auth (Supabase) and newsletter (Beehiiv) are independent.

---

## Supabase

### Project setup

- [ ] Create Supabase project (region near users / GCS if it matters later)
- [ ] Enable Email auth → **Magic link**
- [ ] Require email confirmation (recommended before saving watchlist)
- [ ] Configure site URL + redirect URLs: `https://stockthemes.ai`, `http://localhost:3000`
- [ ] Add env to `.env.local` and GitHub Actions:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Schema (v1)

```sql
-- profiles (optional v1 — can use auth.users only at first)
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  entitlement text not null default 'signed_in_free',
  created_at timestamptz not null default now()
);

create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('theme', 'ticker')),
  item_key text not null,  -- theme slug or ticker symbol (uppercase)
  sort_order int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_key)
);

create index watchlist_items_user_idx on public.watchlist_items (user_id, item_type, sort_order);
```

- [ ] RLS: `user_id = auth.uid()` for all `SELECT` / `INSERT` / `UPDATE` / `DELETE` on `watchlist_items`
- [ ] Enforce **≤20 themes** and **≤20 tickers** per user (DB trigger or app-side before insert)
- [ ] Validate `item_key`: theme slug exists in manifest; ticker in `search_index.v0.json` (app-side)

### Entitlement (future paid)

- [ ] Keep `profiles.entitlement` column now (`signed_in_free` default)
- [ ] Later: `active`, `inactive_paid`, etc. + Stripe — no migration of watchlist rows

---

## Next.js app (`mosaicbot_stockthemes`)

### Dependencies & providers

- [x] Add `@supabase/supabase-js` (SSR package not needed for v1 static shell)
- [x] `SupabaseAuthProvider` + `onAuthStateChange` (client)
- [x] `posthog.identify` / `posthog.reset` on sign-in and sign-out (lazy import)

### Pages & components

- [x] `/sign-in` — email input, magic link sent state, error handling
- [ ] `/my` — **stub** placeholder; Phase 3: auth gate + `WatchlistTable` (themes/tickers toggle)
- [ ] `WatchlistTable` — reuse/compare `CompareThemesTable` styling + `trendingCompareMetrics`
- [ ] `WatchlistStar` on `/themes/[slug]` (and search results when ready)
- [x] `SiteNav` — `SiteNavAuth`: Sign in / Watchlist / Sign out when configured
- [x] `robots` / SEO — `robots: { index: false }` on layouts for `/sign-in`, `/auth/callback`, `/my`

### Static export constraints

- [x] No server-only auth for v1 — browser Supabase client + RLS only
- [x] `/my`, `/sign-in`, `/auth/callback` as static shells that hydrate
- [x] No session baked into theme SSG HTML (auth is client-only)

### Env documentation

- [x] `.env.local.example` lists Supabase `NEXT_PUBLIC_*` vars
- [x] `deploy-pages.yml` passes `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` from repo **Variables** (optional; omit to hide auth on deploy)

---

## MosaicBot ETL (`MosaicBotMain_Local_Dev`)

### `compare_tickers.v0.json` (blocks full ticker tab)

- [ ] In `FetchEODData/stockthemes_manifest.py` (or sibling), export rows from `ticker_performance_latest.parquet`
- [ ] Mirror `compare_themes.v0.json` shape: `{ schema_version, as_of, columns, rows: [{ ticker, name?, compare_returns }] }`
- [ ] Same column keys as Theme Compare where applicable (1D, 10D, MTD, YTD, Period, LstRpt %, SinceLstRpt, SelectedDates…)
- [ ] Upload to `stockthemes-public` next to `compare_themes.v0.json`
- [ ] Add fixture under `mosaicbot_stockthemes/public/fixtures/` for offline dev

### Stock pages (public `/stocks/[ticker]`)

- [ ] Define `stocks/<ticker>.json` schema (chart, themes list, core stats)
- [ ] Publish from ETL; add Next route `src/app/stocks/[ticker]/page.tsx`
- [ ] Extend `search_index` / manifest if needed

### Later (not v1)

- [ ] Text tables per watched theme (admin pipeline → public or gated JSON)
- [ ] Financials on stock/theme lens
- [ ] Alt data (paid tier)

---

## Phased checklist

### Phase 1 — Foundation

- [ ] Supabase project + schema + RLS (run `supabase/migrations/001_watchlist.sql` in SQL Editor)
- [x] Env vars documented (`.env.local.example`) + GitHub Actions Variables for Pages build (`NEXT_PUBLIC_SUPABASE_*`)
- [x] Sign-in page (`/sign-in`), magic-link callback (`/auth/callback`), `/my` stub, nav auth (`SiteNavAuth`)
- [x] Session persistence via `@supabase/supabase-js` + `detectSessionInUrl` / PKCE

Supabase Dashboard: add **Redirect URLs** for `/auth/callback` (apex + localhost + Pages base path if used).

### Phase 2 — Watchlist CRUD

- [ ] `watchlist_items` insert/delete/list
- [ ] ★ on theme detail pages
- [ ] ~~Add ticker from site search~~ — deferred (Phase 4; UI off via `WATCHLIST_TICKERS_UI_ENABLED`)
- [ ] Enforce 20 + 20 limits with clear UI errors

### Phase 3 — `/my` theme tab

- [x] `/my` loads `compare_themes.v0.json` at build time (same as `/compare`; no browser fetch)
- [ ] Join to watchlist; render full column set
- [ ] Footnotes for custom date columns (IRANWAR, LIBDAY)

### Phase 4 — Ticker watchlist + public stocks (deferred)

**Gate:** ship public `/stocks/[ticker]` first, then enable `WATCHLIST_TICKERS_UI_ENABLED` in `src/lib/watchlist/features.ts`.

- [ ] Public `/stocks/[ticker]` minimal page
- [ ] Ship `compare_tickers.v0.json` from ETL
- [ ] Ticker tab on `/my` + ☆ on ticker rows in site search

### Phase 5 — Polish

- [x] Account page (`/account` — email, sign out, delete account via `delete_own_account` RPC)
- [ ] Rate limits / captcha on auth if abuse appears
- [x] PostHog events for funnel: `sign_in` → `watchlist_add` → `my_view` (configure insight in PostHog — `docs/POSTHOG_AUTH_FUNNEL.md`)
- [x] `/account` — “Your submissions” list (`theme_idea_submissions`, status badges)
- [x] Footer label: “Site data published … UTC” (manifest `as_of`; `/my` notes same publish)

### Phase 6 — Paid (later)

- [ ] Stripe + entitlement checks
- [ ] Gate text tables / financials / alt data by `profiles.entitlement`

---

## Testing

- [ ] Local: `npm run dev` + Supabase local or dev project
- [ ] Magic link redirect works on `localhost:3000`
- [ ] RLS: user A cannot read user B watchlist (manual or SQL test)
- [ ] Production smoke: sign in on `stockthemes.ai`, add theme, see `/my` row with metrics
- [ ] Newsletter still submits via Beehiiv iframe after deploy
- [ ] `npm run build` static export still succeeds (no accidental server-only imports in SSG paths)

---

## References (code)

| Area | Location |
|------|----------|
| Compare table UI | `src/components/CompareThemesTable.tsx` |
| Column labels / values | `src/lib/trendingCompareMetrics.ts` |
| Compare JSON loader | `src/lib/loadCompareThemes.ts` |
| Theme compare type | `src/types/theme.detail.v0.ts` → `ThemeCompareReturnsV0` |
| Newsletter (iframe vs API) | `src/components/NewsletterSignup.tsx`, `src/app/layout.tsx` |
| ETL compare themes | `MosaicBot` `FetchEODData/stockthemes_manifest.py` |
| Ticker perf parquet | `ticker_performance_latest.parquet` (used in marketmaps / Dash) |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-19 | Initial plan: free watchlist, Pages + Supabase, `/my` table, Beehiiv iframe, ETL gap for tickers |
| 2026-05-19 | Added **Outside the codebase** checklist (Supabase, GitHub, Beehiiv, GCS/ETL, legal) |
