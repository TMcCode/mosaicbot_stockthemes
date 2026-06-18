/** Theme-suggestion giveaway — baked into static banner copy. */

export const GIVEAWAY_SIGNUPS_PER_PRIZE = 50;
export const GIVEAWAY_DOLLARS_PER_TIER = 100;

/** Last day entries are accepted (US Eastern calendar date, YYYY-MM-DD). Banner hidden from Aug 1 ET. */
export const GIVEAWAY_ENTRIES_CLOSE_DATE = "2026-07-31";

/** Winner selection date (US Eastern calendar date, YYYY-MM-DD). */
export const GIVEAWAY_WINNER_CHOSEN_DATE = "2026-08-05";

/** Versioned so a future giveaway can show the banner again for prior dismissals. */
export const GIVEAWAY_BANNER_DISMISS_STORAGE_KEY = `stockthemes-giveaway-banner-dismissed-${GIVEAWAY_ENTRIES_CLOSE_DATE}`;

export const GIVEAWAY_BANNER_HIDDEN_ATTR = "data-giveaway-banner";

const ET_YMD = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });

/** Today's date in America/New_York as YYYY-MM-DD. */
export function easternDateYmd(now = new Date()): string {
  return ET_YMD.format(now);
}

/** True through Jul 31, 2026 ET (inclusive); false from Aug 1 ET onward. */
export function giveawayEntriesOpen(now = new Date()): boolean {
  return easternDateYmd(now) <= GIVEAWAY_ENTRIES_CLOSE_DATE;
}

export function giveawayPledgedDollars(signUpCount: number): number {
  const n = Math.max(0, Math.floor(signUpCount / GIVEAWAY_SIGNUPS_PER_PRIZE));
  return n * GIVEAWAY_DOLLARS_PER_TIER;
}

export function giveawaySignupsToNextTier(signUpCount: number): number {
  const mod = signUpCount % GIVEAWAY_SIGNUPS_PER_PRIZE;
  return mod === 0 ? GIVEAWAY_SIGNUPS_PER_PRIZE : GIVEAWAY_SIGNUPS_PER_PRIZE - mod;
}

function formatGiveawayEasternDateLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

export function formatGiveawayEntriesCloseLabel(): string {
  return formatGiveawayEasternDateLabel(GIVEAWAY_ENTRIES_CLOSE_DATE);
}

export function formatGiveawayWinnerChosenLabel(): string {
  return formatGiveawayEasternDateLabel(GIVEAWAY_WINNER_CHOSEN_DATE);
}

/** Inline IIFE for layout — hide dismissed banner before first paint. */
export function giveawayBannerDismissScriptContent(): string {
  const key = JSON.stringify(GIVEAWAY_BANNER_DISMISS_STORAGE_KEY);
  const attr = JSON.stringify(GIVEAWAY_BANNER_HIDDEN_ATTR);
  return `(function(){try{var k=${key};if(localStorage.getItem(k)==="1"){document.documentElement.setAttribute(${attr},"hidden");}}catch(e){}})();`;
}
