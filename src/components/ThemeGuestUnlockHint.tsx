"use client";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

import styles from "./ThemeGuestUnlockHint.module.css";

type Props = {
  signInNext: string;
  /** Show Thesis in the unlock list when this theme has thesis content. */
  showThesis?: boolean;
  /** Show Factor Profile when a usable factor sidecar exists. */
  showFactors?: boolean;
};

function unlockBullets(showThesis: boolean, showFactors: boolean): string[] {
  const bullets: string[] = [];
  if (showThesis) {
    bullets.push("Read the full investment thesis for this theme");
  }
  if (showFactors) {
    bullets.push("See factor exposure vs market, sector, and narrative");
  }
  bullets.push("Save themes and track them on My watchlist");
  return bullets;
}

/**
 * Compact hero box for guests: what sign-in unlocks + one CTA.
 * Replaces separate Thesis / Factor Profile gate cards.
 */
export function ThemeGuestUnlockHint({
  signInNext,
  showThesis = false,
  showFactors = false,
}: Props) {
  const { configured, loading, user } = useSupabaseAuth();

  if (!configured || loading || user) {
    return null;
  }

  const features = [
    showThesis ? "Thesis" : null,
    showFactors ? "Factor Profile" : null,
    "Watchlist",
  ].filter(Boolean) as string[];

  if (!showThesis && !showFactors) {
    return null;
  }

  const signInHref = `/sign-in?next=${encodeURIComponent(signInNext)}`;
  const bullets = unlockBullets(showThesis, showFactors);

  return (
    <div className={styles.box} aria-label="Sign in to unlock theme features">
      <div className={styles.row}>
        <p className={styles.features}>{features.join(" · ")}</p>
        <Link href={signInHref} className={styles.btn}>
          Sign in free
        </Link>
      </div>
      <p className={styles.copy}>Free — see the thesis, factors, and track this theme.</p>
      <ul className={styles.bullets}>
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
