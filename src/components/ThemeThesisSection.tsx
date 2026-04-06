import type { CSSProperties } from "react";

import styles from "@/app/page.module.css";
import type { ThemeThesisV0 } from "@/types/theme.detail.v0";

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

export function themeThesisHasContent(tt: ThemeThesisV0 | undefined): boolean {
  if (!tt) {
    return false;
  }
  const thesis = tt.thesis?.trim();
  if (thesis) {
    return true;
  }
  if (tt.thesis_update?.trim()) {
    return true;
  }
  return Boolean(tt.bull_case?.some((s) => s.trim()) || tt.bear_case?.some((s) => s.trim()));
}

type Props = {
  themeThesis: ThemeThesisV0;
  /** Defaults to `theme-thesis-heading` for static page; use a distinct id on runtime-loaded content. */
  headingId?: string;
};

/**
 * Theme_BullBearDetails copy (thesis paragraph, last update, bull/bear bullets) as a readable table.
 */
export function ThemeThesisSection({ themeThesis, headingId = "theme-thesis-heading" }: Props) {
  const tt = themeThesis;
  const thesis = tt.thesis?.trim();
  const upd = tt.thesis_update?.trim();
  const bulls = (tt.bull_case ?? []).map((s) => s.trim()).filter(Boolean);
  const bears = (tt.bear_case ?? []).map((s) => s.trim()).filter(Boolean);

  const cellText: CSSProperties = {
    fontSize: 15,
    lineHeight: 1.55,
    color: "var(--text-secondary, #666)",
    verticalAlign: "top",
    whiteSpace: "pre-wrap",
  };

  const thRow: CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary, #111)",
    verticalAlign: "top",
    width: "9.5rem",
    paddingRight: 12,
  };

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId}>Theme thesis</h2>
      <div className={styles.tableWrap}>
        <table className={styles.dataTable}>
          <tbody>
            {upd ? (
              <tr>
                <th scope="row" style={thRow}>
                  Last updated
                </th>
                <td style={cellText}>{formatThesisUpdateDate(upd)}</td>
              </tr>
            ) : null}
            {thesis ? (
              <tr>
                <th scope="row" style={thRow}>
                  Thesis
                </th>
                <td style={cellText}>{thesis}</td>
              </tr>
            ) : null}
            {bulls.length ? (
              <tr>
                <th scope="row" style={thRow}>
                  Details
                </th>
                <td style={cellText}>
                  <ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
                    {bulls.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ) : null}
            {bears.length ? (
              <tr>
                <th scope="row" style={thRow}>
                  Counterpoints
                </th>
                <td style={cellText}>
                  <ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
                    {bears.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
