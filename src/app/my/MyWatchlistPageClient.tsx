"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import styles from "@/app/page.module.css";
import { PageSurface } from "@/components/PageSurface";

import { MyWatchlistPerformance } from "@/components/MyWatchlistPerformance";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import type { MyWatchlistCompareData } from "@/lib/prepareMyWatchlistCompareData";
import { capturePostHog } from "@/lib/posthogClient";

type Props = {
  compareData: MyWatchlistCompareData;
};

export function MyWatchlistPageClient({ compareData }: Props) {
  const { configured, loading, user } = useSupabaseAuth();
  const myViewCaptured = useRef(false);

  useEffect(() => {
    if (!user || loading || myViewCaptured.current) return;
    myViewCaptured.current = true;
    capturePostHog("my_view");
  }, [user, loading]);

  if (!configured) {
    return (
      <PageSurface>
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
      </PageSurface>
    );
  }

  if (loading) {
    return (
      <PageSurface>
        <main className={styles.main}>
          <p className={styles.introCopy}>Loading…</p>
        </main>
      </PageSurface>
    );
  }

  if (!user) {
    return (
      <PageSurface>
        <main className={styles.main}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>My watchlist</p>
            <h1>Sign in required</h1>
            <p className={styles.introCopy}>Sign in to save themes and track performance here.</p>
            <p className={styles.introCopy}>
              <Link href="/sign-in?next=%2Fmy">Sign in</Link>
              {" · "}
              <Link href="/themes">Browse themes</Link>
            </p>
          </div>
        </main>
      </PageSurface>
    );
  }

  const email = user.email ?? "";

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>My watchlist</p>
          <h1>Your watchlist</h1>
          <MyWatchlistPerformance email={email} compareData={compareData} />
        </div>
      </main>
    </PageSurface>
  );
}
