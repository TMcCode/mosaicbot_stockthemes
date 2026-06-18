"use client";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { RotationMapClient } from "@/components/RotationMapClient";
import styles from "@/app/page.module.css";
import localStyles from "@/app/rotation/page.module.css";

type Props = {
  eyebrow: string;
};

export function RotationMapGate({ eyebrow }: Props) {
  const { configured, loading, user } = useSupabaseAuth();

  if (!configured) {
    return (
      <section className={`${styles.section} ${localStyles.content}`}>
        <p className={styles.introLead}>Sign-in is not configured on this deployment.</p>
      </section>
    );
  }

  if (!loading && !user) {
    return (
      <section className={`${styles.section} ${localStyles.content}`}>
        <div className={localStyles.signInPrompt}>
          <p className={localStyles.signInTitle}>Sign in to view the theme rotation map</p>
          <p className={localStyles.signInCopy}>
            Compare group and theme leadership relative to the S&amp;P 500 — short-term vs
            longer-term performance.
          </p>
          <p className={localStyles.signInActions}>
            <Link href="/sign-in?next=%2Frotation" className={localStyles.signInBtn}>
              Sign in free
            </Link>
            <Link href="/heatmap" className={localStyles.signInSecondary}>
              Market heatmap
            </Link>
          </p>
        </div>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <section className={`${styles.section} ${styles.tightChartTop} ${localStyles.content}`}>
      <RotationMapClient eyebrow={eyebrow} />
    </section>
  );
}
