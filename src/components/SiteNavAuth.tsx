"use client";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

import styles from "./SiteNav.module.css";

export function SiteNavAuth() {
  const { configured, loading, user, signOut } = useSupabaseAuth();

  if (!configured) {
    return null;
  }

  if (loading) {
    return (
      <span className={styles.navMuted} aria-hidden>
        …
      </span>
    );
  }

  if (user) {
    return (
      <>
        <Link href="/my">Watchlist</Link>
        <span className={styles.sep} aria-hidden="true">
          ·
        </span>
        <button type="button" className={styles.navButton} onClick={() => void signOut()}>
          Sign out
        </button>
      </>
    );
  }

  return <Link href="/sign-in">Sign in</Link>;
}
