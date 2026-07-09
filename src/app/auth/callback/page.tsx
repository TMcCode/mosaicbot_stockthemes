"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import { PageSurface } from "@/components/PageSurface";

import { authHardRedirect, resolveAuthNextPath } from "@/lib/authRedirect";
import { getBrowserSupabase } from "@/lib/supabase/browserClient";
import { exchangePkceCodeOnce } from "@/lib/supabase/exchangePkceCodeOnce";

const CALLBACK_TIMEOUT_MS = 15_000;

function oauthErrorFromUrl(url: URL | null): string | null {
  if (!url) {
    return null;
  }
  const description = url.searchParams.get("error_description")?.trim();
  if (description) {
    return description;
  }
  const code = url.searchParams.get("error")?.trim();
  return code ? `Sign-in was cancelled or denied (${code}).` : null;
}

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const client = supabase;
    let cancelled = false;

    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setError("Sign-in is taking longer than expected. Please try again.");
      }
    }, CALLBACK_TIMEOUT_MS);

    async function finish(next: string) {
      if (cancelled) {
        return;
      }
      window.clearTimeout(timeout);
      authHardRedirect(next);
    }

    async function run() {
      try {
        const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
        const oauthError = oauthErrorFromUrl(url);
        if (oauthError) {
          if (!cancelled) {
            window.clearTimeout(timeout);
            setError(oauthError);
          }
          return;
        }

        const code = url?.searchParams.get("code");
        const next = resolveAuthNextPath(url?.searchParams.get("next") ?? null);

        if (code) {
          const { error: ex } = await exchangePkceCodeOnce(client, code);
          if (ex) {
            const { data: after } = await client.auth.getSession();
            if (after.session) {
              await finish(next);
              return;
            }
            if (!cancelled) {
              window.clearTimeout(timeout);
              setError(ex.message);
            }
            return;
          }
        } else {
          const { data: { session }, error: sessErr } = await client.auth.getSession();
          if (sessErr && !cancelled) {
            window.clearTimeout(timeout);
            setError(sessErr.message || "Unable to restore session.");
            return;
          }
          if (!session && !cancelled) {
            window.clearTimeout(timeout);
            setError("Missing authorization code. Please try signing in again.");
            return;
          }
        }

        await finish(next);
      } catch (e: unknown) {
        if (!cancelled) {
          window.clearTimeout(timeout);
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

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
