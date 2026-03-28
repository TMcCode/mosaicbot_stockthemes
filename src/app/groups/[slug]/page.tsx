import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import styles from "../../page.module.css";

import { getGroupDetailCached } from "@/lib/getGroupDetailCached";
import { getManifestCached } from "@/lib/getManifestCached";
import { loadManifest } from "@/lib/loadManifest";
import type { GroupDetailChildThemeV0 } from "@/types/group.detail.v0";
import type { ManifestThemeSummaryV0 } from "@/types/manifest.v0";

type Props = { params: Promise<{ slug: string }> };

/** Pre-render one HTML per group for static hosting (GitHub Pages). */
export const dynamicParams = false;

export async function generateStaticParams() {
  const { manifest } = await loadManifest();
  return manifest.groups.map((g) => ({ slug: g.slug }));
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
  const g = manifest.groups.find((x) => x.slug === slug);
  if (!g) {
    return { title: "Group not found" };
  }
  const loaded = await getGroupDetailCached(slug);
  const desc =
    loaded?.detail.seo_intro != null && loaded.detail.seo_intro.trim() !== ""
      ? clipDescription(loaded.detail.seo_intro)
      : `${g.name}: ${g.theme_count ?? 0} themes, ${g.ticker_count ?? 0} tickers — stockthemes.ai`;
  return {
    title: g.name,
    description: desc,
  };
}

function childRowFromManifest(
  themes: ManifestThemeSummaryV0[],
): { slug: string; name: string; ticker_count?: number }[] {
  return themes.map((t) => ({
    slug: t.slug,
    name: t.name,
    ticker_count: t.ticker_count ?? undefined,
  }));
}

export default async function GroupDetailPage({ params }: Props) {
  const { slug } = await params;
  const { manifest, source } = await getManifestCached();
  const group = manifest.groups.find((x) => x.slug === slug);
  if (!group) {
    notFound();
  }

  const loaded = await getGroupDetailCached(slug);
  const detail = loaded?.detail;
  const detailLabel =
    loaded?.source === "live" ? "live group JSON" : loaded?.source === "fixture" ? "local fixture" : null;

  const themeBySlug = new Map(manifest.themes.map((t) => [t.slug, t]));
  const fromSlugs = group.theme_slugs
    ?.map((s) => themeBySlug.get(s))
    .filter((t): t is ManifestThemeSummaryV0 => t != null);
  const manifestChildren =
    fromSlugs && fromSlugs.length > 0
      ? fromSlugs
      : manifest.themes.filter((t) => t.group_slug === slug);

  const tableRows: GroupDetailChildThemeV0[] =
    detail?.themes?.length ? detail.themes : childRowFromManifest(manifestChildren);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>
            Group · {source === "live" ? "live manifest" : "local fixture"}
            {detailLabel ? ` · ${detailLabel}` : ""}
          </p>
          <h1>{group.name}</h1>
          <p>
            <code className={styles.code}>{group.slug}</code>
            {group.theme_count != null ? ` · ${group.theme_count} themes` : ""}
            {group.ticker_count != null ? ` · ${group.ticker_count} tickers` : ""}
          </p>
          {detail?.seo_intro ? (
            <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 640 }}>
              {detail.seo_intro}
            </p>
          ) : null}
          {!detail ? (
            <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 560 }}>
              No group detail JSON found at <code className={styles.code}>groups/{slug}.json</code>. Run
              MosaicBot <code className={styles.code}>stockthemes_manifest.py</code> with{" "}
              <code className={styles.code}>STOCKTHEMES_PUBLIC_BUCKET</code>, or add{" "}
              <code className={styles.code}>public/fixtures/groups/&lt;slug&gt;.json</code> for offline builds.
            </p>
          ) : null}
          <section className={styles.section} aria-labelledby="group-themes-heading">
            <h2 id="group-themes-heading">Themes in this group</h2>
            {detail?.as_of ? (
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
            ) : null}
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th scope="col">Theme</th>
                    <th scope="col">Slug</th>
                    <th scope="col">Tickers</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((t) => (
                    <tr key={t.slug}>
                      <td>
                        <Link href={`/themes/${t.slug}`} className={styles.name}>
                          {t.name}
                        </Link>
                      </td>
                      <td>
                        <code className={styles.code}>{t.slug}</code>
                      </td>
                      <td>{t.ticker_count != null ? t.ticker_count : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p>
            <Link href="/groups" style={{ fontWeight: 500 }}>
              ← All groups
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
