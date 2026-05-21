"use client";

import Link from "next/link";

import styles from "@/app/page.module.css";
import { PageSurface } from "@/components/PageSurface";
import {
  ThemeIdeaSuggestForm,
  type GroupOption,
} from "@/app/account/suggest/ThemeIdeaSuggestForm";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

type Props = {
  groups: GroupOption[];
};

export function ThemeIdeaSuggestPageClient({ groups }: Props) {
  const { configured, loading, user } = useSupabaseAuth();

  if (!configured) {
    return (
      <PageSurface>
        <main className={styles.main}>
          <p className={styles.introCopy}>Sign-in is not configured.</p>
          <Link href="/account">← Account</Link>
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
            <p className={styles.eyebrow}>Suggest</p>
            <h1>Sign in required</h1>
            <p className={styles.introCopy}>
              <Link href="/sign-in?next=%2Faccount%2Fsuggest">Sign in</Link> to suggest a group or theme.
            </p>
          </div>
        </main>
      </PageSurface>
    );
  }

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Account · Suggest</p>
          <h1>Suggest a group or theme</h1>
          <ThemeIdeaSuggestForm
            userId={user.id}
            submitterEmail={user.email ?? ""}
            groups={groups}
          />
        </div>
      </main>
    </PageSurface>
  );
}
