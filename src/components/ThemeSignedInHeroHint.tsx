"use client";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

import styles from "./ThemeSignedInHeroHint.module.css";

type Props = {
  /** Theme already shows a thesis/seo line in hero meta — skip the soft desk nudge. */
  hasHeroIntro?: boolean;
  showThesis?: boolean;
  showFactors?: boolean;
};

/**
 * Soft signed-in desk pointer when the theme hero has no thesis/seo intro line.
 * Guest unlock box already covers the empty guest case.
 */
export function ThemeSignedInHeroHint({
  hasHeroIntro = false,
  showThesis = false,
  showFactors = false,
}: Props) {
  const { configured, showAuthedUi } = useSupabaseAuth();

  if (!configured || !showAuthedUi || hasHeroIntro) return null;

  const parts = [
    showThesis ? "Thesis" : null,
    showFactors ? "Factor Profile" : null,
    "Earnings",
    "Revenue",
    "Watchlist",
  ].filter(Boolean) as string[];

  return (
    <div className={styles.slot} aria-label="Theme desk">
      <p className={styles.deskHint}>{parts.join(" · ")} below</p>
    </div>
  );
}
