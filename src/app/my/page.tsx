"use client";

import Link from "next/link";

import styles from "@/app/page.module.css";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { useWatchlist } from "@/components/WatchlistProvider";

export default function MyWatchlistPage() {
  const { configured, loading, user } = useSupabaseAuth();
  const watchlist = useWatchlist();

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
            <p className={styles.introCopy}>Create a free account to save themes and tickers soon.</p>
            <p className={styles.introCopy}>
              <Link href="/sign-in">Sign in</Link>
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
          <h1>Signed in</h1>
          <p className={styles.introCopy}>Signed in as {email}.</p>
          {watchlist?.ready ? (
            <p className={styles.introCopy}>
              {watchlist.themeCount} of 20 themes · {watchlist.tickerCount} of 20 tickers saved. Use ☆ on theme pages
              or search to add more — performance table coming next.
            </p>
          ) : (
            <p className={styles.introCopy}>
              Use ☆ on theme pages or search to save themes and tickers (up to 20 each).
            </p>
          )}
          <p className={styles.introCopy}>
            <Link href="/themes">Browse themes</Link>
            {" · "}
            <Link href="/">Home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
