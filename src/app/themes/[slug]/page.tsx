import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import styles from "../../page.module.css";

import { getManifestCached } from "@/lib/getManifestCached";
import { getThemeDetailCached } from "@/lib/getThemeDetailCached";
import { loadManifest } from "@/lib/loadManifest";

type Props = { params: Promise<{ slug: string }> };

/** Pre-render one HTML per theme for static hosting (GitHub Pages). */
export const dynamicParams = false;

export async function generateStaticParams() {
  const { manifest } = await loadManifest();
  return manifest.themes.map((t) => ({ slug: t.slug }));
}

function clipDescription(s: string, max = 158): string {
  const t = s.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { manifest } = await getManifestCached();
  const t = manifest.themes.find((x) => x.slug === slug);
  if (!t) {
    return { title: "Theme not found" };
  }
  const loaded = await getThemeDetailCached(slug);
  const desc =
    loaded?.detail.seo_intro != null && loaded.detail.seo_intro.trim() !== ""
      ? clipDescription(loaded.detail.seo_intro)
      : `Stocks and exposure for ${t.name} — stockthemes.ai`;
  return {
    title: t.name,
    description: desc,
  };
}

function formatWeight(w: number): string {
  if (!Number.isFinite(w)) {
    return "—";
  }
  if (w >= 0 && w <= 1) {
    return `${(w * 100).toFixed(1)}%`;
  }
  return w.toFixed(4);
}

export default async function ThemeDetailPage({ params }: Props) {
  const { slug } = await params;
  const { manifest, source } = await getManifestCached();
  const theme = manifest.themes.find((x) => x.slug === slug);
  if (!theme) {
    notFound();
  }

  const group = theme.group_slug
    ? manifest.groups.find((g) => g.slug === theme.group_slug)
    : undefined;

  const loaded = await getThemeDetailCached(slug);
  const detail = loaded?.detail;
  const detailLabel =
    loaded?.source === "live" ? "live theme JSON" : loaded?.source === "fixture" ? "local fixture" : null;

  const hasWeight = Boolean(detail?.constituents?.some((c) => c.weight != null));

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>
            Theme · {source === "live" ? "live manifest" : "local fixture"}
            {detailLabel ? ` · ${detailLabel}` : ""}
          </p>
          <h1>{theme.name}</h1>
          <p>
            <code className={styles.code}>{theme.slug}</code>
            {theme.ticker_count != null ? ` · ${theme.ticker_count} tickers (manifest)` : ""}
          </p>
          {theme.group_slug ? (
            <p>
              Group:{" "}
              <Link href={`/groups/${theme.group_slug}`} style={{ fontWeight: 600 }}>
                {group?.name ?? theme.group_slug}
              </Link>
            </p>
          ) : null}
          {detail?.seo_intro ? (
            <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 640 }}>
              {detail.seo_intro}
            </p>
          ) : null}
          {!detail ? (
            <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 560 }}>
              No theme detail JSON found at <code className={styles.code}>themes/{slug}.json</code>. Run
              MosaicBot <code className={styles.code}>stockthemes_manifest.py</code> with{" "}
              <code className={styles.code}>STOCKTHEMES_PUBLIC_BUCKET</code>, or add a file under{" "}
              <code className={styles.code}>public/fixtures/themes/</code> for offline builds.
            </p>
          ) : null}
          {detail?.constituents?.length ? (
            <section className={styles.section} aria-labelledby="constituents-heading">
              <h2 id="constituents-heading">Constituents</h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 0 }}>
                Data as of{" "}
                <time dateTime={detail.as_of}>{new Date(detail.as_of).toLocaleString()}</time>
                {detail.build_id ? (
                  <>
                    {" "}
                    · build <code className={styles.code}>{detail.build_id}</code>
                  </>
                ) : null}
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th scope="col">Ticker</th>
                      <th scope="col">Name</th>
                      {hasWeight ? <th scope="col">Weight</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.constituents.map((c) => (
                      <tr key={c.ticker}>
                        <td>
                          <code className={styles.code}>{c.ticker}</code>
                        </td>
                        <td>{c.name ?? "—"}</td>
                        {hasWeight ? (
                          <td>{c.weight != null ? formatWeight(c.weight) : "—"}</td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
          {detail && !detail.constituents.length ? (
            <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>No constituents in this payload.</p>
          ) : null}
          <p>
            <Link href="/themes" style={{ fontWeight: 500 }}>
              ← All themes
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
