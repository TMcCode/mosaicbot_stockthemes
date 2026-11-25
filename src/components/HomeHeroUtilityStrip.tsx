"use client";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

import styles from "./HomeHeroUtilityStrip.module.css";

/**
 * Quiet link under home search: My watchlist (signed-in) or Sign in free (guest).
 */
export function HomeHeroUtilityStrip() {
  const { configured, loading, user, showAuthedUi } = useSupabaseAuth();
  const signedIn = configured && (Boolean(user) || showAuthedUi);

  const item = signedIn
    ? { href: "/my", label: "My watchlist" }
    : {
        href: `/sign-in?next=${encodeURIComponent("/")}`,
        label: "Sign in free",
      };

  return (
    <nav
      className={styles.strip}
      aria-label="Account"
      aria-busy={configured && loading ? true : undefined}
    >
      <span className={styles.item}>
        <Link href={item.href} className={styles.link}>
          {item.label}
        </Link>
      </span>
    </nav>
  );
}
