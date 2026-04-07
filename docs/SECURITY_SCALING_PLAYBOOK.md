# stockthemes.ai Security Scaling Playbook

This playbook outlines how to harden `stockthemes.ai` over time without over-engineering too early.

Primary goals:

- Protect against abusive scraping and automated misuse.
- Preserve SEO discoverability and user experience.
- Introduce controls in proportion to real traffic and business value.

---

## 1) Principles

- Public pages are inherently scrapeable; focus on protecting high-value data and operations.
- Add controls in layers: legal -> observability -> edge controls -> access controls.
- Avoid anti-bot measures that block search indexing or degrade Core Web Vitals.
- Measure first, then tighten controls where abuse is proven.

---

## 2) Traffic-Based Security Tiers

Use **monthly unique visitors (MUV)** as the default trigger.

## Tier 0: 0 - 10k MUV (Now)

Objective: baseline trust + lightweight deterrence.

Controls:

- Keep legal pages live and linked (`/privacy`, `/terms`, `/cookie-policy`).
- Add explicit Terms language prohibiting bulk extraction/republication.
- Keep `robots.txt`, `sitemap.xml`, and `ads.txt` healthy (indexing + compliance).
- Add build/version markers (`as_of`, `build_id`) to public artifacts for provenance.
- Basic monitoring:
  - 4xx/5xx rates
  - Top requesting IPs / user agents
  - Requests by path family (`manifest`, `themes`, `groups`)

Exit criteria to next tier:

- Consistent bot bursts or obvious automated harvesting patterns.
- Infra/network costs become non-trivial.

## Tier 1: 10k - 100k MUV

Objective: detect and throttle abuse while preserving SEO.

Controls:

- Put site behind an edge/WAF layer (Cloudflare or equivalent).
- Add rate limits by path:
  - stricter on JSON artifact endpoints
  - looser on HTML pages
- Enable bot management rules:
  - challenge suspicious high-frequency agents
  - allow verified good bots (Googlebot, Bingbot, etc.)
- Add anomaly alerts:
  - sudden request spikes
  - repeated full-catalog pulls
- Improve cache strategy:
  - long cache for stable artifacts
  - controlled revalidation for freshness endpoints

Exit criteria to next tier:

- Persistent scraping despite throttling.
- Data replication appears in competitor products.

## Tier 2: 100k - 500k MUV

Objective: separate public content from protected value.

Controls:

- Migrate from pure static GitHub Pages to edge-capable hosting (Vercel/Cloudflare Workers/etc.).
- Split data into:
  - Public tier (indexable summaries)
  - Controlled tier (higher-fidelity/low-latency datasets) behind API gateway
- Add API keys for controlled endpoints.
- Enforce per-key quotas and burst limits.
- Add signed URLs or short-lived tokens for high-value downloads.
- Add abuse automation:
  - temporary IP bans
  - fingerprint-based throttles

Exit criteria to next tier:

- Meaningful revenue dependency on proprietary data freshness.
- Coordinated scraping or credential abuse.

## Tier 3: 500k+ MUV

Objective: production-grade platform security and governance.

Controls:

- Full API management:
  - per-customer auth
  - quota tiers
  - usage billing hooks
- Advanced anti-automation:
  - behavior scoring
  - dynamic challenge policies
  - endpoint-specific bot defenses
- Security operations:
  - runbooks for abuse events
  - incident response timelines
  - regular penetration testing and dependency audits
- Data governance:
  - formal data classification
  - strict separation of public vs premium derivations
  - audit trails for data publication

---

## 3) SEO-Safe Guardrails

Always preserve:

- Crawl access to canonical HTML routes.
- Clean metadata, canonical tags, and sitemap freshness.
- Verified search bot allowlists at edge layer.

Never do:

- Blanket bot blocks without verified-bot exceptions.
- Aggressive JS challenges on all pages.
- Heavy client anti-scrape scripts that hurt LCP/INP.

---

## 4) Suggested Platform Path

Near-term (current):

- Keep GitHub Pages for speed/cost while traffic is early.
- Add observability and edge CDN protections where possible.

Mid-term:

- Move app hosting to edge platform.
- Keep static rendering benefits, but gain WAF/rate/bot controls.

Long-term:

- Treat core data as product APIs with policy + quota enforcement.

---

## 5) 30/60/90-Day Execution Template

30 days:

- Finalize legal anti-extraction language.
- Instrument traffic and bot dashboards.
- Define thresholds for automated alerts.

60 days:

- Enable WAF + path-based rate limits.
- Validate no SEO regression in Search Console.
- Document abuse response runbook.

90 days:

- Decide on migration trigger from GitHub Pages to edge-hosted stack.
- Prototype controlled data endpoint for premium-value fields.

---

## 6) Simple Trigger Matrix

- If monthly infra cost from bot traffic > 15% of total hosting cost -> enable stricter rate limits.
- If one actor can pull > 50% of artifact catalog in < 1 hour -> add tokenized access for high-value endpoints.
- If SEO impressions drop after bot controls -> roll back and re-allow verified crawlers immediately.

---

## 7) Ownership

- Product/Founder: policy, risk tolerance, migration timing.
- Engineering: implementation of controls and monitoring.
- Growth/SEO: crawler allowlists, indexing health, regression checks.

---

## 8) Status Checklist

- [ ] Tier 0 baseline complete
- [ ] Monitoring dashboards live
- [ ] WAF/rate-limit policy drafted
- [ ] Migration criteria agreed
- [ ] Premium/protected data boundary defined

