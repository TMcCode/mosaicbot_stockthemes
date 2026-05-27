# AdSense / “low value content” — site-specific fix list (stockthemes.ai)

This document is a **concrete audit** of the `mosaicbot_stockthemes` Next.js app as it exists today: what reviewers and automated quality checks are likely to treat as thin, plus **specific** changes to consider (editorial, data pipeline, or code). GitHub Pages hosting is **not** the core issue; **indexable HTML text**, **trust pages**, and **avoiding “unfinished product” signals** matter more.

---

## Executive summary

Strengths you already have:

- Substantial **About** (`src/app/about/page.tsx`) and **Methodology** (`src/app/about/methodology/page.tsx`) with real paragraphs (and optional CMS-driven copy via `getWebsiteContentCached`).
- **Privacy**, **Terms**, **Cookie policy** routes exist and are linked from the footer (`src/components/SiteFooter.tsx`).
- Theme and group detail pages support **`seo_intro`** and theme **`thesis`** in JSON; metadata uses them when present (`generateMetadata` in theme/group slug pages).

Main gaps for “publisher quality”:

1. **Very little crawlable prose** on the homepage and on the **themes/groups index** pages (mostly UI + lists).
2. **Theme/group detail pages** can render as **mostly tables + charts** when `seo_intro` / thesis are absent—classic “data directory” thinness.
3. **Sitemap** omits several important informational URLs (legal + about + feed).
4. **User-visible developer / build instructions** on live theme and group pages when detail JSON is missing—reads like an **unfinished** or internal tool to a human reviewer.
5. **Privacy → Contact** points to “About page” channels, but there is **no dedicated Contact** route; contact depends on optional `home_intro` text containing `hello@stockthemes.ai`.

---

## 1. Homepage (`src/app/page.tsx`)

**Issue:** Above the fold is essentially a headline, a punchline, two links (methodology, newsletter), CTAs, stats, and data widgets. There is **no multi-paragraph** explanation of what the site is, who runs it, limitations, or how to interpret metrics—unlike `/about`.

**Fixes (editorial / UX):**

- Add a **“What is stockthemes.ai?”** block (3–6 short paragraphs) *on the homepage*: problem you solve, what a theme/group is in one place, “not investment advice,” pointer to methodology.
- Add a compact **disclaimer strip** (non-dismissible text or footer-adjacent) linking to methodology limitations—not only buried on `/about/methodology`.
- Optionally surface **one** rotating “editor’s note” or featured methodology snippet (static text is fine).

**Fixes (technical, optional):**

- Add **WebSite** + **Organization** (or **Person**) JSON-LD in `layout.tsx` or `page.tsx` with the same prose summary (aligns with your existing JSON-LD on theme pages).

---

## 2. Themes index (`src/app/themes/page.tsx`)

**Issue:** Copy is essentially: eyebrow + **“All themes”** + `{count} themes, sorted alphabetically.` Then a long list (possibly with ads). That reads as a **directory page**, not an article or guide.

**Fixes (editorial):**

- Add **300–600 words** of unique intro: how themes are curated, how often they change, how weights work (one paragraph + link to methodology), how to use the list, what “tickers” means here.
- Add an **FAQ** subsection (even 5 Q&As) with real sentences (not only schema).

**Fixes (technical):**

- Improve `metadata.description`—currently very generic (`"Browse themes and stocks by theme."`). Match the new intro’s angle.

---

## 3. Groups index (`src/app/groups/page.tsx`)

**Issue:** Same pattern as themes index: thin hero line + directory.

**Fixes (editorial):**

- Explain **Groups vs Themes** (you already do this well on `/about`; **repeat a shorter version** here for first-time visitors who land on `/groups` from search).
- 2–4 paragraphs on **sector buckets** (why Macro / Other exist, how SPY sector is used).

---

## 4. Theme detail (`src/app/themes/[slug]/page.tsx`)

**Issue:** When `detail.theme_thesis` and `detail.seo_intro` are missing, the page is **H1 + counts + huge constituent/earnings table + charts**—high utility for you, but **low unique text** for reviewers.

**Fixes (data / editorial pipeline — highest leverage):**

- Treat **`seo_intro` as required** in the ETL/manifest pipeline for every published theme (MosaicBot `stockthemes_manifest` / theme JSON). Even **120–250 words** per theme changes the site-wide average dramatically.
- Same for **`theme_thesis.thesis`** where possible (already rendered by `ThemeThesisSection`).

**Fixes (code / UX, smaller):**

- When intro fields are missing, show a **visible “About this theme”** placeholder that still contains **useful static copy** (e.g., how baskets are built + link to methodology), not only empty space—so the HTML is never “title + table only.”

---

## 5. Group detail (`src/app/groups/[slug]/page.tsx`)

**Issue:** Without `detail.seo_intro`, the body is counts + theme table + charts—again **directory-like**.

**Fixes (data / editorial pipeline):**

- Require **`seo_intro`** on group JSON for all public groups (same reasoning as themes).

**Fixes (code):**

- Same optional fallback **“About this group”** block when `seo_intro` is absent.

---

## 6. Remove or gate “developer-only” copy on public pages ✅ (implemented)

**Implemented:** Missing-detail messages use user-facing copy in production (`StockthemesDetailUnavailable` + `stockthemesDevBuildHintsEnabled()`). **Eyebrows** that said `live manifest` / `live theme JSON` are **dev-only** in production builds (`detailEyebrowText`, `catalogEyebrowText`, `homeEyebrowText` in `src/lib/stockthemesBuildHints.ts`) — live theme pages show **Theme** only.

**Issue:** Both theme and group pages can render messages about:

- `themes/<slug>.json`, `groups/<slug>.json`
- `NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL`
- `stockthemes_manifest.py`, `STOCKTHEMES_PUBLIC_BUCKET`
- `public/fixtures/...`

Example pattern: “No theme detail JSON at build time…” in `src/app/themes/[slug]/page.tsx` and similar in `src/app/groups/[slug]/page.tsx`.

**Why it hurts AdSense:** Human reviewers interpret this as **site under construction**, **broken deploy**, or **template documentation**—all correlated with “low value” or “low readiness.”

**Fixes (code):**

- Show **user-facing** copy only (e.g., “We’re updating this page; try again soon”) **or** hide entirely in production builds.
- Keep technical hints for **local dev** only (`process.env.NODE_ENV === "development"` or a dedicated `DEBUG_BUILD=1`).

---

## 7. Sitemap (`src/app/sitemap.ts`)

**Issue:** Entries are only `/`, `/groups`, `/themes`, plus each group and theme slug. **Missing:**

- `/about`
- `/about/methodology`
- `/privacy`
- `/terms`
- `/cookie-policy`
- `/feed` (if you want it indexed as a hub)

**Fixes (code):**

- Add static entries for the above (lower `priority` than home is fine). This helps search engines **and** reinforces that these are first-class pages, not afterthoughts.

**Done (2026-05):** `sitemap.xml` only (no public HTML sitemap page — avoids a scrape-friendly URL index). Includes hubs, trust/legal, `/feed`, `/commentary`, `/compare`.

---

## 8. Privacy policy contact (`src/app/privacy/page.tsx`) ✅ (implemented)

**Implemented:** `/contact` lists `hello@`, `support@`, and `themeideas@` (with link to `/account/suggest`). Privacy **Contact** section uses direct `mailto:` links; footer links **Contact**.

---

## 9. Primary navigation (`src/components/SiteNav.tsx`) ✅ (feed + commentary)

**Implemented:** Browse menu includes **Theme activity feed** (`/feed`) and **Market commentary** (`/commentary`).

---

## 10. Feed page (`src/app/feed/page.tsx`) ✅ (intro)

**Implemented:** Crawlable intro (`src/lib/feedPageCopy.ts`) explains event types, ETL/manifest cadence, link to `/commentary`, and manifest `as_of` when available.

---

## 11. New evergreen content (editorial — highest ROI for reconsideration)

Your internal doc `docs/SEO_GEO_EXECUTION_PLAN.md` already mentions **`/about/glossary`**. It **does not exist** in `src/app/` yet.

**Suggested new routes (markdown or TSX):**

| Route | Purpose |
|-------|---------|
| `/about/glossary` | Define 10D, MTD, YTD, earnings columns, “intra-quarter,” data delay, etc., in plain English |
| `/editorial` or `/guides` | Hub for 5–10 articles: “How to read theme performance,” “Limits of thematic baskets,” “How we differ from ETFs,” etc. |
| `/disclaimer` or anchor on home | Short standalone financial disclaimer page (can overlap methodology but should be **one click** from every theme page) |

Even **five** strong guides at ~800–1,500 words each materially change how the site is classified vs. a pure tool.

---

## 12. Metadata polish (code + copy)

Already good: `buildPageMetadata` / `generateMetadata` include canonical, OG, Twitter on major templates.

**Improvements:**

- **Per-theme OG images** are not used (global `/og.png` only)—optional nice-to-have, not required for AdSense.
- Themes/groups **index** titles/descriptions should mention **curated**, **methodology**, **equity themes**—avoid generic “browse” language only.

---

## 13. Accessibility / polish (minor trust signals)

**Issue:** `SiteNav` brand image uses `alt=""` and `aria-hidden` (`src/components/SiteNav.tsx`). Fine for decorative treatment, but some audits prefer **visible text** already present (you have `stockthemes.ai` span—OK).

**Optional:** Ensure at least one **H1 per page** matches user expectation (already mostly true).

---

## 14. What *not* to over-index on

- **Switching off GitHub Pages** alone rarely fixes “low value content.”
- **More ads** before approval can backfire; focus on **text depth and trust pages** first.
- **JSON-LD alone** does not substitute for visible paragraphs.

---

## Priority order (practical)

1. **Never show dev/build instructions** on production theme/group pages (Section 6).
2. **Guarantee `seo_intro` (+ thesis where possible)** for every public theme/group (Section 4–5).
3. **Expand homepage + index pages** with real paragraphs (Sections 1–3).
4. **Sitemap + Contact + Privacy** cleanup (Sections 7–8).
5. **Glossary + guides hub** (Section 11).

---

## File reference quick map

| Area | Primary files |
|------|-----------------|
| Home | `src/app/page.tsx` |
| Indexes | `src/app/themes/page.tsx`, `src/app/groups/page.tsx` |
| Detail | `src/app/themes/[slug]/page.tsx`, `src/app/groups/[slug]/page.tsx` |
| About / methodology | `src/app/about/page.tsx`, `src/app/about/methodology/page.tsx` |
| Legal | `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/app/cookie-policy/page.tsx` |
| Nav / footer | `src/components/SiteNav.tsx`, `src/components/SiteFooter.tsx` |
| Sitemap | `src/app/sitemap.ts` |
| CMS-ish copy | `src/lib/getWebsiteContentCached.ts` (+ upstream JSON source) |

---

*Generated from a static review of the repository; re-run this audit after major IA or manifest changes.*
