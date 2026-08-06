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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s. Please try again.`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
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
    let redirected = false;

    const timeout = window.setTimeout(() => {
      if (!cancelled && !redirected) {
        setError("Sign-in is taking longer than expected. Please try again.");
      }
    }, CALLBACK_TIMEOUT_MS);

    function finish(next: string) {
      if (redirected) {
        return;
      }
      redirected = true;
      window.clearTimeout(timeout);
      // Hard redirect even if Strict Mode already cleaned up this effect — otherwise a
      // successful exchange can complete after unmount and never leave this page.
      authHardRedirect(next);
    }

    function fail(message: string) {
      if (cancelled || redirected) {
        return;
      }
      window.clearTimeout(timeout);
      setError(message);
    }

    async function run() {
      try {
        const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
        const oauthError = oauthErrorFromUrl(url);
        if (oauthError) {
          fail(oauthError);
          return;
        }

        const code = url?.searchParams.get("code");
        const next = resolveAuthNextPath(url?.searchParams.get("next") ?? null);

        if (code) {
          const { error: ex } = await withTimeout(
            exchangePkceCodeOnce(client, code),
            CALLBACK_TIMEOUT_MS,
            "Sign-in",
          );
          if (ex) {
            const { data: after } = await withTimeout(
              client.auth.getSession(),
              5_000,
              "Session restore",
            );
            if (after.session) {
              finish(next);
              return;
            }
            fail(ex.message);
            return;
          }
        } else {
          const {
            data: { session },
            error: sessErr,
          } = await withTimeout(client.auth.getSession(), 5_000, "Session restore");
          if (sessErr) {
            fail(sessErr.message || "Unable to restore session.");
            return;
          }
          if (!session) {
            fail("Missing authorization code. Please try signing in again.");
            return;
          }
        }

        finish(next);
      } catch (e: unknown) {
        fail(e instanceof Error ? e.message : String(e));
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
