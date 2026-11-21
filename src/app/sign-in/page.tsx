"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import signInStyles from "@/app/sign-in/sign-in.module.css";
import { PageSurface } from "@/components/PageSurface";
import { SignInOAuthButtons } from "@/components/SignInOAuthButtons";
import { WatchlistLimitInterestNote } from "@/components/WatchlistLimitInterestNote";

import {
  authCallbackAbsoluteUrl,
  authHardRedirect,
  AUTH_DEFAULT_NEXT_PATH,
  sanitizeAuthNextPath,
} from "@/lib/authRedirect";
import { getEnabledAuthOAuthProviders } from "@/lib/authOAuthProviders";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { getBrowserSupabase } from "@/lib/supabase/browserClient";
import { WATCHLIST_THEME_LIMIT } from "@/lib/watchlist/limitsCopy";

export default function SignInPage() {
  const { configured, loading, user } = useSupabaseAuth();
  const oauthProviders = getEnabledAuthOAuthProviders();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState(AUTH_DEFAULT_NEXT_PATH);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = sanitizeAuthNextPath(new URLSearchParams(window.location.search).get("next"));
    if (next) {
      setReturnPath(next);
    }
  }, []);

  useEffect(() => {
    if (!configured || loading) return;
    if (user) {
      authHardRedirect(returnPath);
    }
  }, [configured, loading, user, returnPath]);

  if (!configured) {
    return (
      <PageSurface>
        <main className={styles.main}>
          <div className={signInStyles.shell}>
            <div className={signInStyles.panel}>
              <div className={signInStyles.header}>
                <p className={signInStyles.eyebrow}>Account</p>
                <h1 className={signInStyles.title}>Sign in unavailable</h1>
                <p className={signInStyles.subtitle}>
                  Authentication is not configured for this deployment. Add{" "}
                  <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                  <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to the build environment.
                </p>
              </div>
              <p className={signInStyles.metaLinks}>
                <Link href="/">← Home</Link>
              </p>
            </div>
          </div>
        </main>
      </PageSurface>
    );
  }

  if (loading || user) {
    return (
      <PageSurface>
        <main className={styles.main}>
          <div className={signInStyles.shell}>
            <div className={signInStyles.panel}>
              <p className={signInStyles.statusCopy}>{user ? "Redirecting…" : "Loading…"}</p>
            </div>
          </div>
        </main>
      </PageSurface>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const redirectTo = authCallbackAbsoluteUrl(returnPath);
    if (!redirectTo) {
      setError("Could not determine callback URL.");
      return;
    }
    setBusy(true);
    try {
      const trimmed = email.trim();
      const { error: err } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: redirectTo,
        },
      });
      if (err) {
        setError(err.message);
        return;
      }
      setMessage(
        "Check your inbox — open the link to sign in or finish creating your account (link expires after a short time).",
      );
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={signInStyles.shell}>
          <div className={signInStyles.panel}>
            <div className={signInStyles.header}>
              <p className={signInStyles.eyebrow}>Sign in · Create account</p>
              <h1 className={signInStyles.title}>Curate up to {WATCHLIST_THEME_LIMIT} themes</h1>
              <p className={signInStyles.subtitle}>
                Free account · no password. New here? We create your account on first sign-in.
              </p>
            </div>

            {oauthProviders.length > 0 ? (
              <>
                <SignInOAuthButtons returnPath={returnPath} onError={setError} />
                <div className={signInStyles.orDivider} role="presentation">
                  or email a link
                </div>
              </>
            ) : null}

            <form onSubmit={onSubmit} className={signInStyles.formBlock}>
              <label htmlFor="sign-in-email" className={signInStyles.fieldLabel}>
                Email address
              </label>
              <div className={signInStyles.emailRow}>
                <input
                  id="sign-in-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="you@example.com"
                  disabled={busy}
                  className={signInStyles.emailInput}
                />
                <button type="submit" disabled={busy} className={signInStyles.submitBtn}>
                  {busy ? "Sending…" : "Email link"}
                </button>
              </div>
            </form>

            {message ? <p className={signInStyles.messageOk}>{message}</p> : null}
            {error ? <p className={signInStyles.messageErr}>{error}</p> : null}

            <div className={signInStyles.meta}>
              <WatchlistLimitInterestNote includePlanLine className={signInStyles.metaNote} />
              <p className={signInStyles.metaLinks}>
                <Link href="/privacy">Privacy</Link>
                <span className={signInStyles.metaSep} aria-hidden="true">
                  ·
                </span>
                <Link href="/">Home</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </PageSurface>
  );
}
