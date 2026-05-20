"use client";

import Link from "next/link";

import styles from "@/app/page.module.css";

import { MyWatchlistPerformance } from "@/components/MyWatchlistPerformance";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

export default function MyWatchlistPage() {
  const { configured, loading, user } = useSupabaseAuth();

  if (!configured) {
    return (
      <div className={`st-surface ${styles.page}`}>
        <main className={styles.main}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>My watchlist</p>
            <h1>Not available</h1>
            <p className={styles.introCopy}>Sign-in is not configured on this deployment.</p>
            <Link href="/" className={styles.introCopy}>
              ← Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`st-surface ${styles.page}`}>
        <main className={styles.main}>
          <p className={styles.introCopy}>Loading…</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`st-surface ${styles.page}`}>
        <main className={styles.main}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>My watchlist</p>
            <h1>Sign in required</h1>
            <p className={styles.introCopy}>Sign in to save themes and tickers and track performance here.</p>
            <p className={styles.introCopy}>
              <Link href="/sign-in?next=%2Fmy">Sign in</Link>
              {" · "}
              <Link href="/themes">Browse themes</Link>
            </p>
          </div>
        </main>
      </div>
    );
  }

  const email = user.email ?? "";

  return (
    <div className={`st-surface ${styles.page}`}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>My watchlist</p>
          <h1>Your watchlist</h1>
          <MyWatchlistPerformance email={email} />
          <p className={styles.introCopy} style={{ marginTop: 24 }}>
            <Link href="/themes">Browse themes</Link>
            {" · "}
            <Link href="/compare">Compare all themes</Link>
            {" · "}
            <Link href="/">Home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
