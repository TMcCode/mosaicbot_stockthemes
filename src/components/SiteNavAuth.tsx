"use client";

import { PrefetchIntentLink } from "@/components/PrefetchIntentLink";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { useReturnToSignInHref } from "@/hooks/useReturnToSignInHref";

import styles from "./SiteNav.module.css";

type Props = {
  /**
   * `inline` = desktop Watchlist/Account or Sign in free.
   * `menu` = Browse dropdown account items when signed in (mobile).
   * `mobileGuest` = Sign in free left of Browse on phones (guests only).
   */
  variant?: "inline" | "menu" | "mobileGuest";
};

export function SiteNavAuth({ variant = "inline" }: Props) {
  const { configured, loading, user } = useSupabaseAuth();
  const signInHref = useReturnToSignInHref();

  if (!configured) {
    return null;
  }

  if (variant === "mobileGuest") {
    if (user) return null;
    return (
      <>
        <PrefetchIntentLink
          href={signInHref}
          className={styles.authMobileGuestLink}
          aria-busy={loading || undefined}
        >
          Sign in free
        </PrefetchIntentLink>
        <span className={styles.sep} aria-hidden="true">
          ·
        </span>
      </>
    );
  }

  if (variant === "menu") {
    if (!user) return null;
    return (
      <>
        <div className={styles.menuDivider} role="separator" />
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
      href={signInHref}
      className={styles.authNav}
      aria-busy={loading || undefined}
    >
      Sign in free
    </PrefetchIntentLink>
  );
}
