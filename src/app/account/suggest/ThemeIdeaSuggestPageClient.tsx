"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import styles from "@/app/page.module.css";
import { PageSurface } from "@/components/PageSurface";
import {
  ThemeIdeaSuggestForm,
  type GroupOption,
  type ThemeOption,
} from "@/app/account/suggest/ThemeIdeaSuggestForm";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

type Props = {
  groups: GroupOption[];
  themes: ThemeOption[];
};

const noopSubscribe = () => () => {};

export function ThemeIdeaSuggestPageClient({ groups, themes }: Props) {
  const { configured, loading, user } = useSupabaseAuth();
  // Static export: ?theme= (from the site search "Suggest a new theme" link) is client-only.
  const search = useSyncExternalStore(
    noopSubscribe,
    () => window.location.search,
    () => "",
  );
  const prefillTheme = useMemo(
    () => (new URLSearchParams(search).get("theme") ?? "").trim().slice(0, 120),
    [search],
  );
  const nextPath = prefillTheme
    ? `/account/suggest?theme=${encodeURIComponent(prefillTheme)}`
    : "/account/suggest";

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
              <Link href={`/sign-in?next=${encodeURIComponent(nextPath)}`}>Sign in</Link> to suggest a
              group or theme.
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
            key={prefillTheme}
            initialThemeName={prefillTheme}
            userId={user.id}
            submitterEmail={user.email ?? ""}
            groups={groups}
            themes={themes}
          />
        </div>
      </main>
    </PageSurface>
  );
}
