"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";

import { AccountSubmissions } from "@/app/account/AccountSubmissions";
import accountStyles from "@/app/account/AccountPage.module.css";

import { capturePostHog } from "@/lib/posthogClient";

type Props = {
  user: User;
  email: string;
  created: string | null;
  signOutBusy: boolean;
  deleteBusy: boolean;
  message: string | null;
  error: string | null;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

export function AccountSignedInView({
  user,
  email,
  created,
  signOutBusy,
  deleteBusy,
  message,
  error,
  onSignOut,
  onDeleteAccount,
}: Props) {
  const accountViewCaptured = useRef(false);

  useEffect(() => {
    if (accountViewCaptured.current) return;
    accountViewCaptured.current = true;
    const id = window.requestAnimationFrame(() => {
      capturePostHog("account_view");
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <div className={accountStyles.grid}>
        <div className={accountStyles.card}>
          <p className={accountStyles.row}>
            <strong>Email</strong>
            <br />
            {email}
          </p>
          {created ? (
            <p className={accountStyles.row}>
              <strong>Member since</strong>
              <br />
              {created} (UTC)
            </p>
          ) : null}

          <div className={accountStyles.actions}>
            <Link href="/my" className={accountStyles.btn}>
              My watchlist
            </Link>
            <button
              type="button"
              className={`${accountStyles.btn} ${accountStyles.btnPrimary}`}
              disabled={signOutBusy || deleteBusy}
              onClick={onSignOut}
            >
              {signOutBusy ? "Signing out…" : "Sign out"}
            </button>
          </div>

          <div className={accountStyles.dangerZone}>
            <p className={accountStyles.dangerTitle}>Delete account</p>
            <p className={accountStyles.dangerCopy}>
              Permanently removes your account and watchlist. You can create a new account anytime with
              the same email.
            </p>
            <button
              type="button"
              className={`${accountStyles.btn} ${accountStyles.btnDanger}`}
              disabled={deleteBusy || signOutBusy}
              onClick={onDeleteAccount}
            >
              {deleteBusy ? "Deleting…" : "Delete my account"}
            </button>
          </div>

          {message ? <p className={accountStyles.messageOk}>{message}</p> : null}
          {error ? <p className={accountStyles.messageErr}>{error}</p> : null}
        </div>

        <div className={accountStyles.card}>
          <h2 className={accountStyles.cardTitle}>Suggest a group or theme</h2>
          <p className={accountStyles.cardLead}>
            Propose a new group (with sub-themes) or add a theme to an existing group. Submissions are
            reviewed by the stockthemes team.
          </p>
          <ul className={accountStyles.cardList}>
            <li>New group: name, ≥2 themes, 20–300 word rationale</li>
            <li>Existing group: pick group, theme name, ≥6 tickers, 20–300 word reasoning</li>
          </ul>
          <Link href="/account/suggest" className={`${accountStyles.btn} ${accountStyles.btnPrimary}`}>
            Open suggestion form
          </Link>
        </div>
      </div>

      <AccountSubmissions userId={user.id} />
    </>
  );
}
