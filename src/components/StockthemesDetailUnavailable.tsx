import {
  GROUP_DETAIL_UNAVAILABLE_COPY,
  stockthemesDevBuildHintsEnabled,
  THEME_DETAIL_UNAVAILABLE_COPY,
} from "@/lib/stockthemesBuildHints";

import styles from "@/app/page.module.css";

const bodyStyle = {
  fontSize: 16,
  color: "var(--text-secondary, #666)",
  maxWidth: 560,
} as const;

type Props = {
  kind: "theme" | "group";
  slug: string;
};

export function StockthemesDetailUnavailable({ kind, slug }: Props) {
  if (!stockthemesDevBuildHintsEnabled()) {
    return (
      <p style={bodyStyle}>
        {kind === "theme" ? THEME_DETAIL_UNAVAILABLE_COPY : GROUP_DETAIL_UNAVAILABLE_COPY}
      </p>
    );
  }

  if (kind === "theme") {
    return (
      <p style={bodyStyle}>
        No theme detail JSON at build time and no{" "}
        <code className={styles.code}>NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL</code> — set it in CI so the app
        can load <code className={styles.code}>themes/{slug}.json</code> from the bucket, or add{" "}
        <code className={styles.code}>public/fixtures/themes/{slug}.json</code> for offline builds.
      </p>
    );
  }

  return (
    <p style={bodyStyle}>
      No group detail JSON found at <code className={styles.code}>groups/{slug}.json</code>. Run MosaicBot{" "}
      <code className={styles.code}>stockthemes_manifest.py</code> with{" "}
      <code className={styles.code}>STOCKTHEMES_PUBLIC_BUCKET</code>, or add{" "}
      <code className={styles.code}>public/fixtures/groups/&lt;slug&gt;.json</code> for offline builds.
    </p>
  );
}
