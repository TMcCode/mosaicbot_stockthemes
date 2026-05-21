"use client";

import Link from "next/link";

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
        <Link href="/my">Watchlist</Link>
        <span className={styles.sep} aria-hidden="true">
          ·
        </span>
        <Link href="/account">Account</Link>
      </span>
    );
  }

  return (
    <Link href="/sign-in" className={styles.authNav} aria-busy={loading || undefined}>
      Sign in
    </Link>
  );
}
