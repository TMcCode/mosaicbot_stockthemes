"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import { PageSurface } from "@/components/PageSurface";

import { sanitizeAuthNextPath } from "@/lib/authRedirect";
import { getBrowserSupabase } from "@/lib/supabase/browserClient";
import { exchangePkceCodeOnce } from "@/lib/supabase/exchangePkceCodeOnce";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const client = supabase;
    let cancelled = false;

    async function run() {
      try {
        const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
        const code = url?.searchParams.get("code");
        const next = sanitizeAuthNextPath(url?.searchParams.get("next") ?? null) ?? "/my";

        if (code) {
          const { data: before } = await client.auth.getSession();
          if (before.session) {
            if (!cancelled) {
              router.replace(next.startsWith("/") ? next : "/my");
            }
            return;
          }

          const { error: ex } = await exchangePkceCodeOnce(client, code);
          if (ex) {
            if (!cancelled) setError(ex.message);
            return;
          }
        } else {
          const { error: sessErr } = await client.auth.getSession();
          if (sessErr && !cancelled) {
            setError(sessErr.message || "Unable to restore session.");
            return;
          }
        }

        if (!cancelled) {
          router.replace(next.startsWith("/") ? next : "/my");
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          {!error ? (
            <>
              <h1 style={{ marginTop: 0 }}>Finishing sign-in…</h1>
              <p className={styles.introCopy}>You&apos;ll be redirected in a moment.</p>
            </>
          ) : (
            <>
              <h1 style={{ marginTop: 0 }}>Sign-in issue</h1>
              <p className={styles.introCopy}>{error}</p>
              <p className={styles.introCopy}>
                <Link href="/sign-in">Try again</Link>
                {" · "}
                <Link href="/">Home</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </PageSurface>
  );
}
