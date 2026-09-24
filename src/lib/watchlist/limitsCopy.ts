import { HELLO_EMAIL, mailtoHref } from "@/lib/contactEmails";

/** Matches Supabase trigger in supabase/migrations/001_watchlist.sql */
export const WATCHLIST_THEME_LIMIT = 20;

/** Matches profiles.home_radar_theme_slugs cap + home Narrative Radar preview. */
export const HOME_RADAR_HOME_CARD_LIMIT = 6;

export const WATCHLIST_LIMIT_INTEREST_SUBJECT =
  "Watchlist limit — interested in more than 20 themes";

export function watchlistLimitInterestMailto(): string {
  return mailtoHref(HELLO_EMAIL, WATCHLIST_LIMIT_INTEREST_SUBJECT);
}

/** Proactive plan line (sign-in, account). */
export const WATCHLIST_FREE_PLAN_LINE = `Free plan: up to ${WATCHLIST_THEME_LIMIT} themes. Paid tiers aren't available yet.`;

/** Plain-text interest nudge (toasts / string-only errors). */
export const WATCHLIST_LIMIT_INTEREST_PLAIN = `Email ${HELLO_EMAIL} if you need a higher limit.`;

export function watchlistCountLabel(themeCount: number): string {
  return `${themeCount} of ${WATCHLIST_THEME_LIMIT} themes saved`;
}

export function homeRadarPinCountLabel(pinCount: number): string {
  return `${pinCount} of ${HOME_RADAR_HOME_CARD_LIMIT} home cards`;
}

export function watchlistFullPlaceholder(): string {
  return `Watchlist full (${WATCHLIST_THEME_LIMIT} themes)`;
}

/** Cap-moment body without the interest clause (UI adds the mailto link). */
export function watchlistFullHintBody(): string {
  return `Watchlist full (${WATCHLIST_THEME_LIMIT} themes max). Remove one to add another.`;
}

export function watchlistFullErrorMessage(kind: "themes" | "tickers" = "themes"): string {
  return `Watchlist full (${WATCHLIST_THEME_LIMIT} ${kind} max). Remove one from your watchlist first. ${WATCHLIST_LIMIT_INTEREST_PLAIN}`;
}

export function homeRadarPinsFullMessage(): string {
  return `Home cards full (${HOME_RADAR_HOME_CARD_LIMIT} max). Uncheck one to add another.`;
}
