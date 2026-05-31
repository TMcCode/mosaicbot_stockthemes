"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import accountStyles from "@/app/account/AccountPage.module.css";

import { fetchMyThemeIdeaSubmissions } from "@/lib/themeIdeas/fetchMySubmissions";
import { submissionDateUtc, submissionStatusLabel, submissionTitle } from "@/lib/themeIdeas/submissionLabels";
import type { ThemeIdeaSubmissionRow, ThemeIdeaSubmissionStatus } from "@/lib/themeIdeas/types";

type Props = {
  userId: string;
};

function statusBadgeClass(status: ThemeIdeaSubmissionStatus): string {
  const base = accountStyles.statusBadge;
  switch (status) {
    case "submitted":
      return `${base} ${accountStyles.status_submitted}`;
    case "under_review":
      return `${base} ${accountStyles.status_under_review}`;
    case "accepted":
      return `${base} ${accountStyles.status_accepted}`;
    case "rejected":
      return `${base} ${accountStyles.status_rejected}`;
    case "duplicate":
      return `${base} ${accountStyles.status_duplicate}`;
    default:
      return base;
  }
}

export function AccountSubmissions({ userId }: Props) {
  const [rows, setRows] = useState<ThemeIdeaSubmissionRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setLoadError(null);
    void (async () => {
      try {
        const { rows: loaded, error } = await fetchMyThemeIdeaSubmissions(userId);
        if (cancelled) return;
        setRows(loaded);
        setLoadError(error);
      } catch {
        if (cancelled) return;
        setRows([]);
        setLoadError("Could not load your submissions.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const loading = rows === null;

  return (
    <section className={accountStyles.submissionsSection} aria-labelledby="account-submissions-heading">
      <h2 id="account-submissions-heading" className={accountStyles.cardTitle}>
        Your submissions
      </h2>
      <p className={accountStyles.cardLead}>
        Group, theme, and edit suggestions you sent via the suggestion form. When we publish one, status becomes{" "}
        <strong>Accepted</strong> and links to the live theme.
      </p>

      {loading ? <p className={accountStyles.cardLead}>Loading…</p> : null}

      {!loading && loadError ? <p className={accountStyles.messageErr}>{loadError}</p> : null}

      {!loading && rows.length === 0 && !loadError ? (
        <p className={accountStyles.cardLead}>
          None yet.{" "}
          <Link href="/account/suggest">Suggest a group or theme</Link>
        </p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <ul className={accountStyles.submissionList}>
          {rows.map((row) => (
            <li key={row.id} className={accountStyles.submissionItem}>
              <div className={accountStyles.submissionMain}>
                <span className={accountStyles.submissionTitle}>{submissionTitle(row)}</span>
                <span className={accountStyles.submissionMeta}>{submissionDateUtc(row.created_at)} UTC</span>
              </div>
              <span className={statusBadgeClass(row.status)}>{submissionStatusLabel(row.status)}</span>
              {row.status === "accepted" && row.published_theme_slug ? (
                <Link href={`/themes/${row.published_theme_slug}`} className={accountStyles.submissionLink}>
                  View theme →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
