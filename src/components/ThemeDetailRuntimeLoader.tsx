"use client";

import { useEffect, useState } from "react";

import { Chart1yPanel } from "@/components/Chart1yPanel";
import { buildCompositionMetaMap } from "@/lib/constituentMeta";
import { formatWeight } from "@/lib/formatWeight";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

import styles from "@/app/page.module.css";

type Props = {
  slug: string;
  dataBaseUrl: string;
};

function parseDetail(raw: string): ThemeDetailV0 {
  const data = JSON.parse(raw) as ThemeDetailV0;
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported theme detail schema_version: ${data.schema_version}`);
  }
  if (!data.slug || !data.name || !Array.isArray(data.constituents)) {
    throw new Error("Invalid theme detail JSON");
  }
  return data;
}

/**
 * When static export had no theme JSON at build time, try fetching the same URL in the
 * browser (needs GCS CORS for this origin). Fills charts + constituents when the object exists.
 */
export function ThemeDetailRuntimeLoader({ slug, dataBaseUrl }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ok"; detail: ThemeDetailV0 }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const url = `${dataBaseUrl}/themes/${encodeURIComponent(slug)}.json`;
    fetch(url, { credentials: "omit" })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
      })
      .then((raw) => {
        if (cancelled) return;
        const detail = parseDetail(raw);
        setState({ status: "ok", detail });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, dataBaseUrl]);

  if (state.status === "loading") {
    return (
      <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 560 }}>
        Loading theme JSON from bucket…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 560 }}>
        No theme detail JSON at <code className={styles.code}>themes/{slug}.json</code> (
        {state.message}). Ensure MosaicBot <code className={styles.code}>stockthemes_manifest.py</code>{" "}
        uploaded this file to the public bucket, and that{" "}
        <strong>CORS</strong> allows GET from this site (e.g. GitHub Pages origin in{" "}
        <code className={styles.code}>gcs-cors</code>).
      </p>
    );
  }

  const detail = state.detail;
  const hasWeight = Boolean(detail.constituents?.some((c) => c.weight != null));
  const compositionMetaByTicker = buildCompositionMetaMap(detail.constituents);

  return (
    <>
      <p className={styles.eyebrow} style={{ marginTop: 8 }}>
        Loaded in browser · live theme JSON
      </p>
      {detail.seo_intro ? (
        <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 640 }}>
          {detail.seo_intro}
        </p>
      ) : null}
      <Chart1yPanel chart1y={detail.chart_1y} compositionMetaByTicker={compositionMetaByTicker} />
      {detail.constituents?.length ? (
        <section className={styles.section} aria-labelledby="constituents-heading-runtime">
          <h2 id="constituents-heading-runtime">Constituents</h2>
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
      ) : (
        <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>No constituents in this payload.</p>
      )}
    </>
  );
}
