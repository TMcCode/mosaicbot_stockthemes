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

