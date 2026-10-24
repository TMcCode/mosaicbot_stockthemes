"use client";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { shouldShowThemeThesisUi } from "@/lib/themeThesis";
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
  /** Span the theme hero width (below title + treemap) instead of the left rail. */
  fullBleed?: boolean;
};

function ThesisParagraph({ themeThesis }: { themeThesis: ThemeThesisV0 }) {
  const thesis = themeThesis.thesis?.trim();
  if (!thesis) {
    return null;
  }
  // div — not p: theme pages wrap this in `.intro`, and `.intro p` forces 16–18px.
  return <div className={styles.thesis}>{thesis}</div>;
}

function ThesisUpdateBadge({ themeThesis }: { themeThesis: ThemeThesisV0 }) {
  const upd = themeThesis.thesis_update?.trim();
  if (!upd) {
    return null;
  }
  return (
    <div className={styles.updateBadge}>
      <span className={styles.badge}>Thesis update: {formatThesisUpdateDate(upd)}</span>
    </div>
  );
}

/**
 * Theme thesis + update badge. Guests see nothing here — unlock copy lives in the hero hint.
 */
export function ThemeThesisBlock({ themeThesis, fullBleed = false }: Props) {
  if (!shouldShowThemeThesisUi(themeThesis)) {
    return null;
  }

  const thesis = themeThesis!;
  const { configured, loading, user } = useSupabaseAuth();
  const wrapClass = fullBleed ? `${styles.block} ${styles.blockFull}` : styles.block;

  if (!configured) {
    return (
      <div className={wrapClass} aria-labelledby="theme-thesis-heading">
        <div className={styles.head}>
          <h2 id="theme-thesis-heading" className={styles.title}>
            Thesis
          </h2>
        </div>
        <ThesisParagraph themeThesis={thesis} />
        <ThesisUpdateBadge themeThesis={thesis} />
      </div>
    );
  }

  if (loading || !user) {
    return null;
  }

  return (
    <div className={wrapClass} aria-labelledby="theme-thesis-heading">
      <div className={styles.head}>
        <h2 id="theme-thesis-heading" className={styles.title}>
          Thesis
        </h2>
      </div>
      <ThesisParagraph themeThesis={thesis} />
      <ThesisUpdateBadge themeThesis={thesis} />
    </div>
  );
}
