"use client";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { rotationThemeLabelSuffix, themeDisplayLabel } from "@/lib/rotationThemeLabel";
import type { StockThemeMembershipPublicV0 } from "@/types/stock.detail.v0";

import styles from "./StockMembershipChips.module.css";

type Props = {
  ticker: string;
  themes: StockThemeMembershipPublicV0[];
};

function chipLabel(theme: StockThemeMembershipPublicV0): string {
  const name = theme.name || theme.slug;
  const group = theme.group_name?.trim() || null;
  const suffix = group ? rotationThemeLabelSuffix(name, group) : "";
  if (suffix) return suffix;
  return themeDisplayLabel(name) || name;
}

/**
 * Signed-in stock hero: compact membership theme chips → theme pages.
 * Guests see StockGuestUnlockHint instead.
 */
export function StockMembershipChips({ ticker, themes }: Props) {
  const { configured, showAuthedUi } = useSupabaseAuth();

  if (!configured || !showAuthedUi || themes.length === 0) {
    return null;
  }

  return (
    <div className={styles.block}>
      <p className={styles.label}>{ticker} Themes</p>
      <div className={styles.wrap} aria-label={`${ticker} theme membership`}>
        {themes.map((t) => {
          const slug = t.slug?.trim();
          if (!slug) return null;
          return (
            <Link
              key={slug}
              href={`/themes/${encodeURIComponent(slug)}`}
              className={styles.chip}
              title={themeDisplayLabel(t.name || slug) || slug}
            >
              {chipLabel(t)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
