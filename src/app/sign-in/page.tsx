"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";

import { authCallbackAbsoluteUrl, sanitizeAuthNextPath } from "@/lib/authRedirect";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { getBrowserSupabase } from "@/lib/supabase/browserClient";

export default function SignInPage() {
  const router = useRouter();
  const { configured, loading, user } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState("/my");

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
      router.replace(returnPath);
    }
  }, [configured, loading, user, router, returnPath]);

  if (!configured) {
    return (
      <div className={`st-surface ${styles.page}`}>
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
      </div>
    );
  }

  if (loading || user) {
    return (
      <div className={`st-surface ${styles.page}`}>
        <main className={styles.main}>
          <p className={styles.introCopy}>{user ? "Redirecting…" : "Loading…"}</p>
        </main>
      </div>
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
    <div className={`st-surface ${styles.page}`}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Sign in · Create account</p>
          <h1>Add email to curate stockthemes.ai — up to 20 themes</h1>
          <p className={styles.introCopy}>
            <strong>New here?</strong> Enter your email below — we&apos;ll send a one-time link. Opening it{" "}
            <strong>creates your free account</strong> (no separate sign-up form).
          </p>
          <p className={styles.introCopy}>
            <strong>Already use stockthemes?</strong> Same link signs you back in — no passwords. Personal
            watchlists and performance tables ship next.
          </p>

          <form onSubmit={onSubmit} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 360 }}>
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
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--nav-border, rgba(255,255,255,0.14))",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text-primary, #eaf2f0)",
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 15,
                }}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              style={{
                padding: "11px 16px",
                borderRadius: 10,
                border: "none",
                background: "var(--accent, #26fcd6)",
                color: "#040506",
                fontWeight: 600,
                cursor: busy ? "default" : "pointer",
              }}
            >
              {busy ? "Sending…" : "Email me a secure link"}
            </button>
          </form>

          {message ? (
            <p className={styles.introCopy} style={{ marginTop: 16, color: "var(--accent, #26fcd6)" }}>
              {message}
            </p>
          ) : null}
          {error ? (
            <p className={styles.introCopy} style={{ marginTop: 16, color: "#f87171" }}>
              {error}
            </p>
          ) : null}

          <p className={styles.introCopy} style={{ marginTop: 24 }}>
            <Link href="/privacy">Privacy</Link>
            {" · "}
            <Link href="/">Home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
