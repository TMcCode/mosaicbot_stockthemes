"use client";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

import styles from "./HomeHeroSignInHint.module.css";

/** Max ~6–7 words each. */
const BULLETS = [
  "Themes are how markets move",
  "Theme factors, growth, constituent reasoning",
  "Theme & ticker performance, revenue, estimates",
  "Track trending themes & create your own watchlist",
] as const;

/** Desktop-only guest CTA in the home hero gap beside the stats rail. */
export function HomeHeroSignInHint() {
  const { configured, showAuthedUi } = useSupabaseAuth();

  if (!configured || showAuthedUi) return null;

  return (
    <div className={styles.slot} aria-label="Sign in free">
      <div className={styles.box}>
        <Link href={`/sign-in?next=${encodeURIComponent("/")}`} className={styles.btn}>
          Sign in free
        </Link>
        <ul className={styles.bullets}>
          {BULLETS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
