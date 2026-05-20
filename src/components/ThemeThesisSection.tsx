"use client";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { shouldShowThemeThesisUi, themeThesisHasContent } from "@/lib/themeThesis";
import type { ThemeThesisV0 } from "@/types/theme.detail.v0";

import styles from "./ThemeThesisSection.module.css";

function formatThesisUpdateDate(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return "—";
  }
  const ms = Date.parse(t);
  if (!Number.isNaN(ms)) {
    return new Date(ms).toISOString().slice(0, 10);
  }
  if (t.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(t)) {
    return t.slice(0, 10);
  }
  return t;
}

type Props = {
  themeThesis?: ThemeThesisV0;
  /** Return path after sign-in (e.g. `/themes/my-slug`). */
  signInNext?: string;
};

function ThesisParagraph({ themeThesis }: { themeThesis: ThemeThesisV0 }) {
  const thesis = themeThesis.thesis?.trim();
  if (!thesis) {
    return null;
  }
  return <p className={styles.thesis}>{thesis}</p>;
}

function ThesisUpdateBadge({ themeThesis }: { themeThesis: ThemeThesisV0 }) {
  const upd = themeThesis.thesis_update?.trim();
  if (!upd) {
    return null;
  }
  return (
    <p className={styles.updateBadge}>
      <span className={styles.badge}>Thesis update: {formatThesisUpdateDate(upd)}</span>
    </p>
  );
}

function ThesisSignInPrompt({ signInNext }: { signInNext?: string }) {
  const signInHref = signInNext
    ? `/sign-in?next=${encodeURIComponent(signInNext)}`
    : "/sign-in";

  return (
    <div className={styles.locked} aria-label="Theme thesis sign-in prompt">
      <p className={styles.lockedTitle}>Sign in to read the full theme thesis</p>
      <p className={styles.lockedCopy}>
        Free account — unlock the investment thesis for this theme, save it to your watchlist, and
        track performance on My watchlist.
      </p>
      <div className={styles.lockedActions}>
        <Link href={signInHref} className={styles.signInBtn}>
          Sign in free
        </Link>
        <Link href="/my" className={styles.secondaryLink}>
          What is My watchlist?
        </Link>
      </div>
    </div>
  );
}

/**
 * Theme thesis + update badge; guests see a sign-in prompt instead of thesis text.
 */
export function ThemeThesisBlock({ themeThesis, signInNext }: Props) {
  if (!shouldShowThemeThesisUi(themeThesis)) {
    return null;
  }

  const thesis = themeThesis!;
  const { configured, loading, user } = useSupabaseAuth();

  if (!configured) {
    return (
      <div className={styles.block}>
        <ThesisParagraph themeThesis={thesis} />
        <ThesisUpdateBadge themeThesis={thesis} />
      </div>
    );
  }

  if (loading) {
    return null;
  }

  if (!user) {
    if (!themeThesisHasContent(thesis)) {
      return null;
    }
    return (
      <div className={styles.block}>
        <ThesisSignInPrompt signInNext={signInNext} />
      </div>
    );
  }

  return (
    <div className={styles.block}>
      <ThesisParagraph themeThesis={thesis} />
      <ThesisUpdateBadge themeThesis={thesis} />
    </div>
  );
}
