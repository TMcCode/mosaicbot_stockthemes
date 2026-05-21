# PostHog — auth & watchlist funnel

Events are sent from the browser when PostHog is configured (`NEXT_PUBLIC_POSTHOG_KEY` or `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`).

## Events (in order)

| Step | Event | When | Properties |
|------|--------|------|------------|
| 1 | `sign_in` | User completes magic-link sign-in | — (user identified with `posthog.identify`) |
| 2 | `watchlist_add` | User saves a theme (★) | `item_type`, `item_key` |
| 3 | `my_view` | Signed-in user opens `/my` | — |

Related (not in this funnel):

| Event | When |
|--------|------|
| `account_view` | Signed-in user opens `/account` |
| `theme_idea_submitted` | Suggestion form succeeds | `kind`, `submission_id`, optional `group_slug` |

## Create the funnel in PostHog

1. Open your PostHog project → **Product analytics** → **Insights** → **New insight**.
2. Choose **Funnel**.
3. Add steps in order:
   - `sign_in`
   - `watchlist_add`
   - `my_view`
4. **Conversion window:** e.g. 7 or 14 days (users may sign in, add a theme later, then visit `/my`).
5. **Filter** (optional): `item_type` = `theme` on step 2 if you want theme saves only (ticker UI is off in v1).
6. Save as **“Auth: sign-in → watchlist → My”** and pin to a dashboard.

## Tips

- **Identify:** After `sign_in`, the same person is tied to email via `identify` in `SupabaseAuthProvider` — funnel steps should stitch across sessions for logged-in users.
- **Guests:** `my_view` only fires when signed in; anonymous `/my` does not emit it.
- **Testing:** Use PostHog **Live events** while you sign in, star a theme, and open `/my` on localhost or production.

## Optional follow-ups

- Break down step 2 by `item_key` to see which themes get saved most.
- Add a second funnel: `sign_in` → `theme_idea_submitted` for contributor engagement.
- Alert if `sign_in` volume spikes without `watchlist_add` (onboarding friction).
