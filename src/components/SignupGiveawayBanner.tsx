import Link from "next/link";
import Script from "next/script";

import {
  formatGiveawayEntriesCloseLabel,
  formatGiveawayWinnerChosenLabel,
  GIVEAWAY_ENTRIES_CLOSE_DATE,
  giveawayEntriesOpen,
  giveawayPledgedDollars,
  giveawaySignupsToNextTier,
  GIVEAWAY_DOLLARS_PER_TIER,
  GIVEAWAY_SIGNUPS_PER_PRIZE,
} from "@/lib/giveawayConfig";
import { HELLO_EMAIL, mailtoHref } from "@/lib/contactEmails";
import { getSignupStatsBaked } from "@/lib/loadSignupStats";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

import styles from "./SignupGiveawayBanner.module.css";

function formatNextUpdateLabel(iso: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

/**
 * Static giveaway strip — count baked at build; no client fetch.
 * Hidden after Jul 31, 2026 ET: checked at static export time (each deploy).
 */
export function SignupGiveawayBanner() {
  if (!getSupabasePublicConfig()) return null;
  if (!giveawayEntriesOpen()) return null;

  const stats = getSignupStatsBaked();
  if (!stats?.available) return null;

  const pledged = giveawayPledgedDollars(stats.sign_up_count);
  const toNext = giveawaySignupsToNextTier(stats.sign_up_count);
  const nextUpdate = formatNextUpdateLabel(stats.next_update_at);
  const closeLabel = formatGiveawayEntriesCloseLabel();
  const winnerLabel = formatGiveawayWinnerChosenLabel();

  return (
    <>
      <Script
        id="signup-giveaway-deadline"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var c=${JSON.stringify(GIVEAWAY_ENTRIES_CLOSE_DATE)};var t=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York"}).format(new Date());if(t>c){var el=document.getElementById("signup-giveaway-banner");if(el)el.remove();}}catch(e){}})();`,
        }}
      />
      <aside
        id="signup-giveaway-banner"
        className={styles.wrap}
        aria-label="Theme suggestion giveaway"
      >
      <div className={styles.inner}>
        <p className={styles.line}>
          <strong>{stats.sign_up_count.toLocaleString()}</strong> sign-ups
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <strong>${pledged.toLocaleString()}</strong> in theme giveaways pledged
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          ${GIVEAWAY_DOLLARS_PER_TIER} per {GIVEAWAY_SIGNUPS_PER_PRIZE} sign-ups
          <span className={styles.detail}>
            ({toNext} to next tier)
          </span>
        </p>
        <p className={styles.meta}>
          50% to the best unique investable theme · 50% to 1 random subscriber
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <Link href="/account/suggest" className={styles.link}>
            Suggest a theme
          </Link>
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <a
            href={mailtoHref(HELLO_EMAIL, "Theme or site suggestion")}
            className={styles.link}
          >
            {HELLO_EMAIL}
          </a>
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          Entries close {closeLabel}
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          Winner {winnerLabel}
        </p>
        <p className={styles.note}>
          {nextUpdate ? (
            <>
              Count updates ~{nextUpdate}
              <span className={styles.sep} aria-hidden="true">
                ·
              </span>
            </>
          ) : null}
          {stats.update_schedule_note}
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <Link href="/contact" className={styles.link}>
            Disclosures
          </Link>
        </p>
      </div>
    </aside>
    </>
  );
}
