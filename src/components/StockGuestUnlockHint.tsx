"use client";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

import styles from "./StockGuestUnlockHint.module.css";

type Props = {
  signInNext: string;
  /** Display symbol already on the page (no fetch). */
  ticker: string;
};

const FEATURES = ["Earnings", "Revenue", "Rev Revisions", "Quality & Risk", "Notes"] as const;

/**
 * Stock-page guest unlock box — theme shell, slightly larger type for stock hero.
 */
export function StockGuestUnlockHint({ signInNext, ticker }: Props) {
  const { configured, showAuthedUi } = useSupabaseAuth();

  if (!configured || showAuthedUi) {
    return null;
  }

  const symbol = ticker.trim().toUpperCase() || "this ticker";
  const signInHref = `/sign-in?next=${encodeURIComponent(signInNext)}`;
  const bullets = [
    "Earnings returns around report dates vs membership themes",
    "Revenue growth, valuation, and CQ / CY / NY estimate revisions",
    "Quality and risk across membership themes",
    `Notes on why ${symbol} sits in each theme`,
  ] as const;

  return (
    <div className={styles.heroSlot}>
      <div className={styles.box} aria-label="Sign in to unlock stock analysis">
        <div className={styles.row}>
          <p className={styles.features}>{FEATURES.join(" · ")}</p>
          <Link href={signInHref} className={styles.btn}>
            Sign in free
          </Link>
        </div>
        <p className={styles.copy}>
          Free — unlock the analyst desk for {symbol} (earnings, revenue, quality, notes).
        </p>
        <ul className={styles.bullets}>
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
