"use client";

import Link from "next/link";
import { useCallback } from "react";

import {
  GIVEAWAY_BANNER_DISMISS_STORAGE_KEY,
  GIVEAWAY_BANNER_HIDDEN_ATTR,
  GIVEAWAY_DOLLARS_PER_TIER,
  GIVEAWAY_SIGNUPS_PER_PRIZE,
} from "@/lib/giveawayConfig";
import { HELLO_EMAIL, mailtoHref } from "@/lib/contactEmails";

import styles from "./SignupGiveawayBanner.module.css";

export type SignupGiveawayBannerClientProps = {
  signUpCount: number;
  pledged: number;
  toNext: number;
  nextUpdate: string | null;
  closeLabel: string;
  winnerLabel: string;
  updateScheduleNote: string;
};

function dismissGiveawayBanner(): void {
  try {
    localStorage.setItem(GIVEAWAY_BANNER_DISMISS_STORAGE_KEY, "1");
    document.documentElement.setAttribute(GIVEAWAY_BANNER_HIDDEN_ATTR, "hidden");
  } catch {
    document.documentElement.setAttribute(GIVEAWAY_BANNER_HIDDEN_ATTR, "hidden");
  }
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SignupGiveawayBannerClient({
  signUpCount,
  pledged,
  toNext,
  nextUpdate,
  closeLabel,
  winnerLabel,
  updateScheduleNote,
}: SignupGiveawayBannerClientProps) {
  const onDismiss = useCallback(() => {
    dismissGiveawayBanner();
  }, []);

  return (
    <aside
      id="signup-giveaway-banner"
      className={styles.wrap}
      aria-label="Theme suggestion giveaway"
    >
      <div className={styles.inner}>
        <p className={styles.line}>
          <strong>{signUpCount.toLocaleString()}</strong> sign-ups
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <strong>${pledged.toLocaleString()}</strong> in theme giveaways pledged
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          ${GIVEAWAY_DOLLARS_PER_TIER} per {GIVEAWAY_SIGNUPS_PER_PRIZE} sign-ups
          <span className={styles.detail}>({toNext} to next tier)</span>
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
          {updateScheduleNote}
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <Link href="/contact" className={styles.link}>
            Disclosures
          </Link>
        </p>
      </div>
      <button
        type="button"
        className={styles.dismiss}
        onClick={onDismiss}
        aria-label="Dismiss giveaway banner"
        title="Dismiss"
      >
        <CloseIcon />
      </button>
    </aside>
  );
}
