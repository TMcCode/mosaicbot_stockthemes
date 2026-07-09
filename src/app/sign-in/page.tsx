"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import signInStyles from "@/app/sign-in/sign-in.module.css";
import { PageSurface } from "@/components/PageSurface";
import { SignInOAuthButtons } from "@/components/SignInOAuthButtons";

import {
  authCallbackAbsoluteUrl,
  authHardRedirect,
  AUTH_DEFAULT_NEXT_PATH,
  sanitizeAuthNextPath,
} from "@/lib/authRedirect";
import { getEnabledAuthOAuthProviders } from "@/lib/authOAuthProviders";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { getBrowserSupabase } from "@/lib/supabase/browserClient";

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
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Account</p>
            <h1>Sign in unavailable</h1>
            <p className={styles.introCopy}>
              Authentication is not configured for this deployment. Add{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
              to the build environment.
            </p>
            <Link href="/" className={styles.introCopy}>
              ← Home
            </Link>
          </div>
        </main>
      </PageSurface>
    );
  }

  if (loading || user) {
    return (
      <PageSurface>
        <main className={styles.main}>
          <p className={styles.introCopy}>{user ? "Redirecting…" : "Loading…"}</p>
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
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Sign in · Create account</p>
          <h1>Add email to curate stockthemes.ai — up to 20 themes</h1>
          <p className={styles.introCopy}>
            <strong>New here?</strong> Use Google, GitHub, or a one-time email link — we&apos;ll{" "}
            <strong>create your free account</strong> on first sign-in (no password).
          </p>
          <p className={styles.introCopy}>
            <strong>Already use stockthemes?</strong> Same options sign you back in. Personal watchlists
            and performance tables ship next.
          </p>

          {oauthProviders.length > 0 ? (
            <>
              <SignInOAuthButtons returnPath={returnPath} onError={setError} />
              <div className={signInStyles.orDivider} role="presentation">
                or email a link
              </div>
            </>
          ) : null}

          <form onSubmit={onSubmit} className={signInStyles.formBlock}>
            <label htmlFor="sign-in-email">
              <span className={styles.introCopy} style={{ display: "block", marginBottom: 6 }}>
                Email address
              </span>
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
            </label>
            <button type="submit" disabled={busy} className={signInStyles.submitBtn}>
              {busy ? "Sending…" : "Email me a secure link"}
            </button>
          </form>

          {message ? (
            <p className={`${styles.introCopy} ${signInStyles.messageOk}`}>{message}</p>
          ) : null}
          {error ? (
            <p className={`${styles.introCopy} ${signInStyles.messageErr}`}>{error}</p>
          ) : null}

          <p className={styles.introCopy} style={{ marginTop: 24 }}>
            <Link href="/privacy">Privacy</Link>
            {" · "}
            <Link href="/">Home</Link>
          </p>
        </div>
      </main>
    </PageSurface>
  );
}
