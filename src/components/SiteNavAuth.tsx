"use client";

import { PrefetchIntentLink } from "@/components/PrefetchIntentLink";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

import styles from "./SiteNav.module.css";

type Props = {
  /** `menu` = Browse dropdown items (mobile). Default = inline links. */
  variant?: "inline" | "menu";
};

export function SiteNavAuth({ variant = "inline" }: Props) {
  const { configured, loading, user } = useSupabaseAuth();

  if (!configured) {
    return null;
  }

  if (variant === "menu") {
    if (user) {
      return (
        <>
          <PrefetchIntentLink
            href="/radar?tab=watchlist"
            className={styles.menuItem}
            role="menuitem"
          >
            Watchlist
          </PrefetchIntentLink>
          <PrefetchIntentLink href="/account" className={styles.menuItem} role="menuitem">
            Account
          </PrefetchIntentLink>
        </>
      );
    }
    return (
      <PrefetchIntentLink
        href="/sign-in"
        className={styles.menuItem}
        role="menuitem"
        aria-busy={loading || undefined}
      >
        Sign in
      </PrefetchIntentLink>
    );
  }

  if (user) {
    return (
      <span className={styles.authNav}>
        <PrefetchIntentLink href="/radar?tab=watchlist">Watchlist</PrefetchIntentLink>
        <span className={styles.sep} aria-hidden="true">
          ·
        </span>
        <PrefetchIntentLink href="/account">Account</PrefetchIntentLink>
      </span>
    );
  }

  return (
    <PrefetchIntentLink
      href="/sign-in"
      className={styles.authNav}
      aria-busy={loading || undefined}
    >
      Sign in
    </PrefetchIntentLink>
  );
}
