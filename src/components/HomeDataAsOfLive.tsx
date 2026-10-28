"use client";

import { useEffect, useState } from "react";

import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import {
  priceReturnsBrowserCacheBusterQuery,
  priceReturnsRevalidateSeconds,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";

import styles from "@/app/page.module.css";

type Props = {
  /** Baked manifest as_of (SSR / static export fallback). */
  serverAsOf: string;
  /** Prefer price freshness when baked into the last Pages sync. */
  serverTickerPerformanceAsOf?: string | null;
};

type ManifestMetaLite = {
  schema_version?: number;
  as_of?: string;
  ticker_performance_as_of?: string;
};

function pickAsOfIso(
  serverAsOf: string,
  serverTickerPerformanceAsOf: string | null | undefined,
  live: ManifestMetaLite | null,
): string {
  const liveTpa = String(live?.ticker_performance_as_of || "").trim();
  const liveAsOf = String(live?.as_of || "").trim();
  const serverTpa = String(serverTickerPerformanceAsOf || "").trim();
  return liveTpa || liveAsOf || serverTpa || serverAsOf;
}

/**
 * Home hero “Data as of” — SSR shows the last Pages-baked stamp, then hydrates
 * from ``manifest_meta.v0.json`` (rewritten on price-only) so the chip tracks
 * ~10‑min slim freshness without a full site rebuild.
 */
export function HomeDataAsOfLive({
  serverAsOf,
  serverTickerPerformanceAsOf,
}: Props) {
  const [liveMeta, setLiveMeta] = useState<ManifestMetaLite | null>(null);

  useEffect(() => {
    const base = stockthemesPublicDataBase();
    if (!base) return;

    let cancelled = false;
    let intervalId: number | null = null;

    const load = () => {
      const url = `${base.replace(/\/$/, "")}/manifest_meta.v0.json?${priceReturnsBrowserCacheBusterQuery()}`;
      void fetch(url, {
        credentials: "omit",
        cache: stockthemesBrowserFetchCache(),
      })
        .then(async (res) => {
          if (!res.ok) return null;
          return (await res.json()) as ManifestMetaLite;
        })
        .then((data) => {
          if (cancelled || !data) return;
          const asOf = String(data.as_of || data.ticker_performance_as_of || "").trim();
          if (!asOf) return;
          setLiveMeta(data);
        })
        .catch(() => {
          /* keep baked stamp */
        });
    };

    load();
    intervalId = window.setInterval(load, priceReturnsRevalidateSeconds() * 1000);
    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, []);

  const iso = pickAsOfIso(serverAsOf, serverTickerPerformanceAsOf, liveMeta);
  if (!iso) return null;

  return (
    <li className={`${styles.statCard} ${styles.statAsOf}`}>
      <span>Data as of</span>
      <strong>
        <time dateTime={iso} title={formatSiteDataPublished(iso)}>
          {formatSiteDataPublished(iso, { compact: true })}
        </time>
      </strong>
    </li>
  );
}
