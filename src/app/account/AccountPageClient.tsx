"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import styles from "@/app/page.module.css";

import { AccountSignedInView } from "@/app/account/AccountSignedInView";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { getBrowserSupabase } from "@/lib/supabase/browserClient";

export function AccountPageClient() {
  const router = useRouter();
  const { configured, loading, user, signOut } = useSupabaseAuth();
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSignOut = useCallback(async () => {
    setSignOutBusy(true);
    setError(null);
    try {
      await signOut();
      router.replace("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sign out failed.");
    } finally {
      setSignOutBusy(false);
    }
  }, [signOut, router]);

  const onDeleteAccount = useCallback(async () => {
    const ok = window.confirm(
      "Delete your stockthemes.ai account permanently? Your watchlist will be removed. This cannot be undone.",
    );
    if (!ok) return;

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Account deletion is not available.");
      return;
    }

    setDeleteBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { error: rpcErr } = await supabase.rpc("delete_own_account");
      if (rpcErr) {
        setError(
          rpcErr.message.includes("delete_own_account")
            ? "Account deletion is not enabled yet. Run supabase/migrations/002_delete_own_account.sql in your Supabase project."
            : rpcErr.message,
        );
        return;
      }
      await signOut();
      setMessage("Your account was deleted.");
      router.replace("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not delete account.");
    } finally {
      setDeleteBusy(false);
    }
  }, [signOut, router]);

  if (!configured) {
    return (
      <div className={`st-surface ${styles.page}`}>
        <main className={styles.main}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Account</p>
            <h1>Not available</h1>
            <p className={styles.introCopy}>Sign-in is not configured on this deployment.</p>
            <Link href="/" className={styles.introCopy}>
              ← Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`st-surface ${styles.page}`}>
        <main className={styles.main}>
          <p className={styles.introCopy}>Loading…</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`st-surface ${styles.page}`}>
        <main className={styles.main}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Account</p>
            <h1>Sign in required</h1>
            <p className={styles.introCopy}>Sign in to manage your stockthemes.ai account.</p>
            <p className={styles.introCopy}>
              <Link href="/sign-in?next=%2Faccount">Sign in</Link>
              {" · "}
              <Link href="/">Home</Link>
            </p>
          </div>
        </main>
      </div>
    );
  }

  const email = user.email ?? "—";
  const created = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        timeZone: "UTC",
        dateStyle: "medium",
      })
    : null;

  return (
    <div className={`st-surface ${styles.page}`}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Account</p>
          <h1>Your account</h1>
          <p className={styles.introCopy}>
            Free stockthemes.ai account — theme watchlist and performance on{" "}
            <Link href="/my">My watchlist</Link>.
          </p>

          <AccountSignedInView
            user={user}
            email={email}
            created={created}
            signOutBusy={signOutBusy}
            deleteBusy={deleteBusy}
            message={message}
            error={error}
            onSignOut={() => void onSignOut()}
            onDeleteAccount={() => void onDeleteAccount()}
          />

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
