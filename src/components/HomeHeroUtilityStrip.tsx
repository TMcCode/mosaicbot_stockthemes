"use client";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

import styles from "./HomeHeroUtilityStrip.module.css";

/**
 * Quiet home-only links under the punchline / above search.
 * Guest vs signed-in destinations differ; keep the row short and gray.
 */
export function HomeHeroUtilityStrip() {
  const { configured, loading, user, showAuthedUi } = useSupabaseAuth();
  const signedIn = configured && (Boolean(user) || showAuthedUi);

  const items: { href: string; label: string }[] = [
    { href: "/docs/how-to", label: "How to use" },
    { href: "/desk", label: "Newsletter" },
  ];

  if (signedIn) {
    items.push(
      { href: "/compare?my=1&sort=3M", label: "My Watchlist Performance" },
      { href: "/compare?picks=1&sort=3M", label: "Most talked about" },
    );
  } else {
    items.push(
      {
        href: `/sign-in?next=${encodeURIComponent("/")}`,
        label: "Sign in free",
      },
      { href: "/compare?sort=3M", label: "Top performers" },
    );
  }

  return (
    <nav
      className={styles.strip}
      aria-label="Quick links"
      aria-busy={configured && loading ? true : undefined}
    >
      {items.map((item, i) => (
        <span key={item.href} className={styles.item}>
          {i > 0 ? (
            <span className={styles.dot} aria-hidden="true">
              ·
            </span>
          ) : null}
          <Link href={item.href} className={styles.link}>
            {item.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
