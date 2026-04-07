<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into stockthemes.ai. Here is a summary of all changes made:

**New files created:**
- `instrumentation-client.ts` — Client-side PostHog initialization using the Next.js 15.3+ `instrumentation-client` pattern. Enables automatic pageview capture, session replay, and exception tracking site-wide with no Provider component needed.
- `src/lib/posthog-server.ts` — Singleton `posthog-node` client for server-side event capture in API routes.

**Files edited:**
- `src/components/SiteSearch.tsx` — Tracks `search_result_clicked` (kind, slug, name, query) when a user navigates to a search result, and `search_no_results` (query) when a search returns zero hits.
- `src/components/NewsletterSignup.tsx` — Tracks `newsletter_signup_submitted`, `newsletter_signup_succeeded`, and `newsletter_signup_failed` (with error details and HTTP status) in the API-mode signup flow. Passes `X-POSTHOG-DISTINCT-ID` and `X-POSTHOG-SESSION-ID` headers to the server route for cross-domain correlation.
- `src/components/ThemeToggle.tsx` — Tracks `theme_toggled` (from/to) when the user switches between light and dark mode.
- `src/components/ThemeDetailRuntimeLoader.tsx` — Tracks `theme_detail_runtime_loaded` (slug) on successful browser-side theme JSON fetch, and `theme_detail_runtime_error` (slug, error) on failure. Also calls `posthog.captureException` for error tracking.
- `src/app/api/newsletter/subscribe/route.ts` — Server-side capture of `newsletter_subscribed` (with referring URL and session correlation) on Beehiiv success, and `newsletter_subscribe_failed` (reason, HTTP status) on rate-limit or Beehiiv errors.

**Environment / config:**
- `.env.local` — `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` written.
- `posthog-js` and `posthog-node` installed.

---

## Events instrumented

| Event | Description | File |
|---|---|---|
| `search_result_clicked` | User navigated to a search result (theme, group, or ticker) | `src/components/SiteSearch.tsx` |
| `search_no_results` | Search returned zero results for a query | `src/components/SiteSearch.tsx` |
| `newsletter_signup_submitted` | User submitted the newsletter API form | `src/components/NewsletterSignup.tsx` |
| `newsletter_signup_succeeded` | Newsletter API signup completed successfully | `src/components/NewsletterSignup.tsx` |
| `newsletter_signup_failed` | Newsletter API signup returned an error | `src/components/NewsletterSignup.tsx` |
| `newsletter_subscribed` | Server-side: Beehiiv confirmed the subscription | `src/app/api/newsletter/subscribe/route.ts` |
| `newsletter_subscribe_failed` | Server-side: Beehiiv rejected or rate-limited the request | `src/app/api/newsletter/subscribe/route.ts` |
| `theme_detail_runtime_loaded` | Theme detail JSON loaded in-browser (runtime fallback) | `src/components/ThemeDetailRuntimeLoader.tsx` |
| `theme_detail_runtime_error` | Theme detail browser fetch failed | `src/components/ThemeDetailRuntimeLoader.tsx` |
| `theme_toggled` | User switched between light and dark theme | `src/components/ThemeToggle.tsx` |

---

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://us.posthog.com/project/371191/dashboard/1435433
- **Newsletter signup funnel** (submitted → succeeded): https://us.posthog.com/project/371191/insights/Ir4bjW77
- **Search: clicks vs no-results** (daily search quality): https://us.posthog.com/project/371191/insights/gx5FPNLM
- **Newsletter subscriptions (server-side)** (subscribed vs failed): https://us.posthog.com/project/371191/insights/yuNaYAcI
- **Search result clicks by kind** (theme/group/ticker breakdown): https://us.posthog.com/project/371191/insights/3xRBjUeh
- **Newsletter signup errors over time** (failure rate %): https://us.posthog.com/project/371191/insights/MgMZZcT9

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
