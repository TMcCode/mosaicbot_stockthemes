"use client";

import { PrefetchIntentLink } from "@/components/PrefetchIntentLink";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

import styles from "./SiteNav.module.css";

export function SiteNavAuth() {
  const { configured, loading, user } = useSupabaseAuth();

  if (!configured) {
    return null;
  }

  if (user) {
    return (
      <span className={styles.authNav}>
        <PrefetchIntentLink href="/my">Watchlist</PrefetchIntentLink>
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
