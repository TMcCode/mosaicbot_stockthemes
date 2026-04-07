# stockthemes.ai SEO + GEO Execution Plan

This document is a practical implementation roadmap for improving both:

- **SEO** (search engine discoverability/rankability)
- **GEO** (Generative Engine Optimization for LLM answer retrieval/citation)

It is organized as phased work with priorities, acceptance criteria, and tracking metrics.

---

## 1) Goals and Success Metrics

### Core goals

1. Improve qualified organic traffic to theme/group pages.
2. Increase visibility of stockthemes.ai in AI-generated answers.
3. Improve click-through rates on high-intent pages (theme/group pages).
4. Make content consistently machine-readable and entity-rich.

### North-star metrics

- **SEO**
  - Non-brand organic sessions (GA4 / Search Console)
  - Impressions and clicks by page type (`/themes/[slug]`, `/groups/[slug]`)
  - Avg position and CTR for target queries
- **GEO**
  - Frequency of stockthemes.ai citations in LLM outputs (manual weekly checks + prompt set)
  - Share of "answerable" pages with structured metadata coverage
  - Crawl/index health for pages with schema

### Quality guardrails

- No meaningful regression in LCP/INP/CLS.
- No crawl blockers (robots, canonical, sitemap, noindex errors).
- Structured data passes rich result/schema validation.

---

## 2) Current-State Summary (What exists now)

- Theme and group pages are statically generated and crawlable.
- Titles/descriptions are generated per page.
- Theme pages now show thesis copy above canned intro (better topical relevance).
- Public JSON artifacts exist for manifest/theme/group/search/home_trending.

Main gaps:

- No page-level JSON-LD for themes/groups.
- Incomplete canonical/OG/Twitter coverage strategy.
- No dedicated GEO assets strategy (`llms.txt`, retrieval-oriented page sections, citation prompts).
- Internal linking can be stronger (related entities, breadcrumbs, contextual hubs).

---

## 3) Prioritized Roadmap

## Phase 0 (Week 1): Foundation and No-Regret Wins

Priority: **P0**

### 0.1 Add robust page metadata standards

- Standardize metadata for all major templates:
  - Home, themes index, groups index, theme detail, group detail, about
- Ensure each page has:
  - Unique `title`
  - Intent-aligned `description`
  - Canonical URL
  - OpenGraph + Twitter cards

Acceptance:

- 100% major templates have complete metadata.

### 0.2 Sitemap + robots validation

- Ensure sitemap includes all static routes with `lastmod`.
- Use `updated_at`/`as_of` where available for freshness.
- Confirm robots allows desired crawling paths.

Acceptance:

- Search Console sees sitemap without errors.
- New/updated pages are discovered quickly.

### 0.3 Internal link reinforcement

- Add visible related links on detail pages:
  - Theme -> group
  - Group -> related themes
  - Theme -> related themes in same group (if available)
- Add consistent breadcrumb links.

Acceptance:

- Each detail page has at least 3 meaningful internal links.

---

## Phase 1 (Week 1-2): Structured Data (Schema) for SEO + GEO

Priority: **P0**

### 1.1 Add JSON-LD on theme pages

Include at minimum:

- `WebPage`
- Dataset-like entity (`Dataset` or `DefinedTermSet`-style model based on final validation)
- Fields:
  - `name`
  - `description`
  - `dateModified`
  - `about`
  - `keywords`
  - `mentions` (tickers/entities where sensible)
  - `url`
  - `isPartOf` (site + group linkage)

### 1.2 Add JSON-LD on group pages

Include:

- `WebPage`
- Collection-like entity (`CollectionPage` + entity list)
- Fields:
  - `name`
  - `description`
  - `dateModified`
  - `about`
  - `hasPart` (themes)
  - `url`

### 1.3 Validate schema

- Test with schema validators and Search Console enhancement reports.
- Ensure no contradictory fields or malformed dates.

Acceptance:

- 95%+ theme/group pages emit valid JSON-LD.
- No critical schema errors in production monitoring.

---

## Phase 2 (Week 2-4): Content Architecture for Retrieval

Priority: **P1**

### 2.1 Standardize "answer blocks" on theme pages

Add concise sections:

1. What this theme is
2. Why it matters now
3. How to track it
4. Key constituents / exposure summary

These improve both snippet quality and LLM extraction quality.

### 2.2 Add "entity clarity" patterns

- Ensure consistent naming and aliases:
  - Theme name variants
  - Group aliases
  - Ticker/company mapping
- Keep semantic consistency across title/H1/JSON-LD/body.

### 2.3 Create glossary + methodology hubs

- `/about/methodology` (data sources, refresh cadence, caveats)
- `/about/glossary` (return windows, custom dates, terms)

Acceptance:

- Theme pages have structured answer blocks and stable entity naming.
- Methodology pages become authoritative citation targets.

---

## Phase 3 (Week 3-5): GEO-Specific Assets and Policies

Priority: **P1**

### 3.1 Add `llms.txt` (+ optional `llms-full.txt`)

Purpose:

- Explicitly tell LLM crawlers how to interpret, cite, and prioritize pages.

Include:

- Site summary
- Canonical sections to cite (themes/groups/methodology)
- Freshness semantics (`as_of`, `updated_at`)
- Preferred citation patterns

### 3.2 Add retrieval-friendly page summaries

- 2-4 sentence abstract near top of each detail page.
- Keep factual and non-promotional.

### 3.3 Add citation-oriented source lines

- "Data as of", "Build ID", and data source hints in clean machine-readable form.
- Encourage trustworthy LLM citations.

Acceptance:

- LLM prompt test set shows higher citation frequency and fewer hallucinated attributes.

---

## Phase 4 (Week 4-8): Authority + Distribution

Priority: **P2**

### 4.1 Build topic hubs and interlink clusters

- Cluster pages around major macro groups.
- Link child themes and "compare themes" paths.

### 4.2 External authority signals

- Publish reference content with consistent canonical links.
- Build backlinks from relevant finance/dev/data communities.

### 4.3 Update cadence messaging

- Explicitly communicate update schedules and freshness.
- This improves trust for both users and LLMs.

Acceptance:

- Improved impressions for non-brand informational queries.
- Increased crawling of deeper thematic pages.

---

## 4) Technical Performance Plan (to avoid SEO regressions)

Performance must stay stable while adding SEO/GEO layers.

### 4.1 Guardrails

- Avoid extra blocking fetches during initial render.
- Reuse existing loaded artifacts (manifest/home_trending/spy snapshot) where possible.
- Keep client bundles lean; no unnecessary heavy scripts above the fold.

### 4.2 Monitoring

- Track LCP, INP, CLS on home and detail templates.
- Compare before/after each phase.

Acceptance:

- No meaningful degradation in Core Web Vitals after each rollout.

---

## 5) Measurement Framework

## 5.1 Weekly dashboard

- Search Console:
  - Queries, pages, CTR, avg position, indexed pages
- Analytics:
  - Organic sessions by landing template
  - Engagement by theme/group
- GEO checks:
  - Fixed prompt suite with weekly manual snapshots
  - Count of stockthemes.ai citations and answer correctness

## 5.2 Experiment loop

- Roll out changes by template.
- Measure 2-3 weeks.
- Keep what lifts visibility/CTR/citation quality.

---

## 6) Implementation Backlog (Actionable Checklist)

## P0 (do first)

- [ ] Add canonical + OG + Twitter metadata coverage on all page templates
- [ ] Add JSON-LD to theme pages
- [ ] Add JSON-LD to group pages
- [ ] Validate schema in production
- [ ] Ensure sitemap + lastmod + robots are clean

## P1

- [ ] Add answer blocks ("what/why/how") on theme pages
- [ ] Add related-links blocks and breadcrumbs everywhere
- [ ] Add methodology + glossary pages
- [ ] Add `llms.txt` with citation guidance

## P2

- [ ] Build topic hubs and stronger interlink clusters
- [ ] Run backlink/outreach strategy
- [ ] Expand benchmark/compare narratives for informational queries

---

## 7) Suggested Ownership

- **Frontend/Template**: metadata, schema injection, internal links
- **Data/ETL**: freshness fields, stable entity keys, build IDs
- **Content**: answer blocks, methodology text, glossary
- **Growth/SEO**: Search Console ops, query mapping, backlink strategy

---

## 8) Immediate Next 3 Tasks (Recommended)

1. Implement JSON-LD for theme + group pages.
2. Add canonical/OG/Twitter parity across templates.
3. Add `llms.txt` with clear site and citation guidance.

These 3 produce the highest SEO/GEO impact with relatively low engineering risk.

For **how to run AdSense setup in parallel**, use **§9** below.

---

## 9) Integrated step-by-step plan (AdSense + SEO + GEO)

One timeline: **AdSense** is mostly configuration and deploy (start early because review can take ~1–2 weeks). **SEO/GEO** is the main engineering track. Work streams can overlap; checkpoints show what “done” looks like.

### Before you start (once)

| Action | Owner | Notes |
|--------|--------|------|
| Confirm live site URL and custom domain (e.g. `https://stockthemes.ai`) | You | AdSense + canonicals + `NEXT_PUBLIC_SITE_URL` must match. |
| Google Search Console property for that URL | You | Needed for sitemap and indexing feedback (Phase 0.2). |
| GitHub Actions variables for build (manifest URL, `NEXT_PUBLIC_SITE_URL`, base path if any) | You | Already in `deploy-pages.yml` comments. |

### Week 1 — Ship foundations + start AdSense clock

**AdSense (parallel, low code)**

1. In **Google AdSense**: add your **site URL**, accept policies, create **Display** ad units for each placement your app expects (`AdPlacement`: hero, theme rail, group rail, group strip — see `.env.local.example`).
2. Set **Repository Variables** (or secrets where appropriate): `NEXT_PUBLIC_ADSENSE_CLIENT`, each `NEXT_PUBLIC_ADSENSE_SLOT_*`.
3. **Deploy** production build. Verify:
   - `https://<your-domain>/ads.txt` returns a single valid `google.com, pub-…, DIRECT, …` line (generated at build from `NEXT_PUBLIC_ADSENSE_CLIENT` via `prebuild`; see `scripts/write-ads-txt.mjs`).
   - Pages show real ad slots (not only placeholders) if env is set.
4. In AdSense, **request site review** / connect site as the product UI directs.

**SEO/GEO (Phase 0)**

5. **§0.1 Metadata**: unique `title` / `description`, **canonical**, **OpenGraph + Twitter** on home, themes index, groups index, theme detail, group detail, about (and any other major templates).
6. **§0.2 Sitemap + robots**: all important routes in sitemap with sensible `lastmod`; `robots.txt` allows crawl; submit sitemap in Search Console.
7. **Light measurement**: note baseline — indexed pages, a few target queries (optional).

**Checkpoint — end of Week 1:** AdSense review submitted (or in progress); metadata + sitemap/robots live; no blocking crawl issues.

### Week 2 — Structured data + internal graph

**AdSense**

8. If Google emails **fixes** (ads.txt, policy, navigation, content): address and resubmit. No need to pause SEO work for this.

**SEO/GEO (Phase 1 + 0.3)**

9. **§1.1–1.2 JSON-LD** on theme and group pages (`WebPage` + entity blocks as in §1).
10. **§1.3 Validate** with schema tools + Search Console enhancements after deploy.
11. **§0.3 Internal links**: theme → group, group → themes, related themes; **breadcrumbs** consistent across detail templates.

**Checkpoint — end of Week 2:** Valid JSON-LD on theme/group pages; stronger internal linking; AdSense either approved or you have a concrete punch list from Google.

### Weeks 3–4 — Retrieval-oriented content + GEO assets

**AdSense**

12. If **approved**: monitor fill and layout; avoid pushing more ad units until CWV stable (§4).
13. If **not approved yet**: keep site compliant; continue SEO/GEO — approval is not a prerequisite for shipping schema and content.

**SEO/GEO (Phases 2–3)**

14. **§2.1–2.2** Answer blocks and entity consistency on theme pages (what / why / how / exposure).
15. **§2.3** Hubs: `/about/methodology`, `/about/glossary` (or equivalent paths).
16. **§3.1 `llms.txt`** (+ optional `llms-full.txt`) with cite-friendly site summary and preferred URLs.
17. **§3.2–3.3** Short top-of-page abstracts + machine-readable “as of” / source lines where appropriate.

**Checkpoint — end of Week 4:** Methodology/glossary live; `llms.txt` live; theme pages easier to quote for humans and models; ads running or still in review without blocking releases.

### Weeks 5+ — Authority and tuning (optional / ongoing)

18. **§4** Topic hubs, clusters, external signals, freshness messaging — as capacity allows.
19. **§5** Weekly: Search Console + analytics + a small GEO prompt checklist.
20. **§4 (performance)** Re-check LCP/INP/CLS after ads + schema + new sections; tighten if needed.

### Rule of thumb

- **Do not** delay Phase 0–1 SEO for AdSense; they reinforce each other (clear site, real URLs, `ads.txt`).
- **Do** submit AdSense in **Week 1** so review time overlaps engineering-heavy weeks.
- **Treat AdSense approval as async**: fix policy requests when they arrive; keep shipping SEO/GEO milestones.

