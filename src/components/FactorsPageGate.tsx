"use client";

import Link from "next/link";
import { Suspense } from "react";

import { FactorsPageClient } from "@/components/FactorsPageClient";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import type { FactorMethodologyItem } from "@/lib/loadFactorMethodology";
import styles from "@/app/page.module.css";
import localStyles from "@/app/factors/page.module.css";

type Props = {
  dataBaseUrl: string;
  factorMethodology: Record<string, FactorMethodologyItem>;
};

export function FactorsPageGate({ dataBaseUrl, factorMethodology }: Props) {
  const { configured, loading, user } = useSupabaseAuth();

  if (!configured) {
    return (
      <section className={`${styles.section} ${localStyles.content}`}>
        <p className={styles.introLead}>Sign-in is not configured on this deployment.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className={`${styles.section} ${localStyles.content}`}>
        <p className={styles.introCopy}>Loading…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className={`${styles.section} ${localStyles.content}`}>
        <div className={localStyles.signInPrompt}>
          <p className={localStyles.signInTitle}>Sign in to browse factor rankings</p>
          <p className={localStyles.signInCopy}>
            Factor exposure scores, theme compare charts, and factor makeup are available to
            signed-in accounts.
          </p>
          <p className={localStyles.signInActions}>
            <Link href="/sign-in?next=%2Ffactors" className={localStyles.signInBtn}>
              Sign in free
            </Link>
            <Link href="/themes" className={localStyles.signInSecondary}>
              Browse themes
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.section} ${localStyles.content}`}>
      <Suspense fallback={<p className={styles.introCopy}>Loading…</p>}>
        <FactorsPageClient dataBaseUrl={dataBaseUrl} factorMethodology={factorMethodology} />
      </Suspense>
    </section>
  );
}
