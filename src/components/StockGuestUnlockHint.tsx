"use client";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

import styles from "./ThemeGuestUnlockHint.module.css";

type Props = {
  signInNext: string;
};

const FEATURES = ["Revenue", "Rev Revisions", "Quality & Risk", "Notes"] as const;

const BULLETS = [
  "See analyst revenue growth estimates and valuation ratios",
  "Track CQ / CY / NY revenue estimate revisions",
  "Compare quality and risk metrics across membership themes",
  "Read why this ticker sits in each theme",
] as const;

/**
 * Compact hero box for guests on stock pages: what sign-in unlocks.
 */
export function StockGuestUnlockHint({ signInNext }: Props) {
  const { configured, showAuthedUi } = useSupabaseAuth();

  if (!configured || showAuthedUi) {
    return null;
  }

  const signInHref = `/sign-in?next=${encodeURIComponent(signInNext)}`;

  return (
    <div className={styles.box} aria-label="Sign in to unlock stock analysis">
      <div className={styles.row}>
        <p className={styles.features}>{FEATURES.join(" · ")}</p>
        <Link href={signInHref} className={styles.btn}>
          Sign in free
        </Link>
      </div>
      <p className={styles.copy}>Free — unlock deeper stock analysis across this ticker’s themes.</p>
      <ul className={styles.bullets}>
        {BULLETS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
