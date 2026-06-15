/** Theme-suggestion giveaway — baked into static banner copy. */

export const GIVEAWAY_SIGNUPS_PER_PRIZE = 50;
export const GIVEAWAY_DOLLARS_PER_TIER = 100;

/** Last day entries are accepted (US Eastern calendar date, YYYY-MM-DD). Banner hidden from Aug 1 ET. */
export const GIVEAWAY_ENTRIES_CLOSE_DATE = "2026-07-31";

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

export function formatGiveawayEntriesCloseLabel(): string {
  const [y, m, d] = GIVEAWAY_ENTRIES_CLOSE_DATE.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}
