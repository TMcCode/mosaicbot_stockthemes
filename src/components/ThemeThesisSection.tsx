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
  return Boolean(tt.thesis?.trim());
}

type Props = {
  themeThesis: ThemeThesisV0;
};

type UpdateProps = {
  themeThesis: ThemeThesisV0 | undefined;
};

/**
 * Render only the headline thesis paragraph (no details/counterpoints table).
 */
export function ThemeThesisSection({ themeThesis }: Props) {
  const thesis = themeThesis.thesis?.trim();
  if (!thesis) {
    return null;
  }
  return <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 760 }}>{thesis}</p>;
}

export function ThemeThesisUpdateBadge({ themeThesis }: UpdateProps) {
  const upd = themeThesis?.thesis_update?.trim();
  if (!upd) {
    return null;
  }
  const updateDate = formatThesisUpdateDate(upd);
  return (
    <p style={{ marginTop: 0, marginBottom: 0 }}>
      <span
        style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: 12,
          border: "1px solid var(--border-subtle, rgba(128,128,128,0.35))",
          background: "var(--surface-muted, rgba(127,127,127,0.08))",
          color: "var(--text-secondary, #666)",
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
        }}
      >
        Thesis update: {updateDate}
      </span>
    </p>
  );
}
