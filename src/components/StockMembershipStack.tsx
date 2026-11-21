"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { formatWeight } from "@/lib/formatWeight";
import {
  mergeStockDetailWithApp,
  parseStockAppPayload,
  stockAppBrowserPath,
} from "@/lib/mergeStockApp";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import type {
  StockDetailV0,
  StockThemeMembershipAppV0,
  StockThemeMembershipPublicV0,
} from "@/types/stock.detail.v0";

import styles from "./StockMembershipStack.module.css";

type Props = {
  ticker: string;
  themes: StockThemeMembershipPublicV0[] | StockThemeMembershipAppV0[];
  /** When true, fetch Tier B `.app` so ThemeWgt can show in the stack. */
  hydrateTierB?: boolean;
  dataBaseUrl?: string;
};

function sortMembership(themes: StockThemeMembershipAppV0[]): StockThemeMembershipAppV0[] {
  const hasWeight = themes.some((t) => t.weight != null && Number.isFinite(t.weight));
  if (!hasWeight) return themes;
  return [...themes].sort((a, b) => {
    const aw = a.weight != null && Number.isFinite(a.weight) ? a.weight : -1;
    const bw = b.weight != null && Number.isFinite(b.weight) ? b.weight : -1;
    return bw - aw;
  });
}

/**
 * Compact hero list of membership themes → theme pages, with ThemeWgt when available.
 */
export function StockMembershipStack({
  ticker,
  themes: themesProp,
  hydrateTierB,
  dataBaseUrl = "",
}: Props) {
  const clientTierB = hydrateTierB ?? Boolean(dataBaseUrl);
  const themeShellKey = themesProp.map((t) => t.slug).join("|");
  const [themes, setThemes] = useState<StockThemeMembershipAppV0[]>(() =>
    themesProp.map((t) => ({ ...t })),
  );

  useEffect(() => {
    setThemes(themesProp.map((t) => ({ ...t })));
    if (!clientTierB || !dataBaseUrl) return;
    let cancelled = false;
    const shell: StockDetailV0 = {
      schema_version: 0,
      ticker,
      as_of: "",
      themes: themesProp.map((t) => ({
        slug: t.slug,
        name: t.name,
        group_slug: t.group_slug,
        group_name: t.group_name,
      })),
    };
    void (async () => {
      try {
        const q = stockthemesBrowserCacheBusterQuery();
        const path = `${stockAppBrowserPath(ticker)}${q ? `?${q}` : ""}`;
        const res = await fetch(path, { cache: stockthemesBrowserFetchCache() });
        if (!res.ok || cancelled) return;
        const raw: unknown = await res.json();
        const app = parseStockAppPayload(raw);
        if (!app || cancelled) return;
        const merged = mergeStockDetailWithApp(shell, app);
        if (!cancelled) setThemes(merged.themes);
      } catch {
        /* keep shell */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- themeShellKey stands in for themesProp
  }, [clientTierB, dataBaseUrl, ticker, themeShellKey]);

  const rows = useMemo(() => sortMembership(themes), [themes]);

  if (!rows.length) return null;

  return (
    <ul className={styles.stack} aria-label={`${ticker} theme membership`}>
      {rows.map((t) => {
        const slug = t.slug?.trim();
        if (!slug) return null;
        const weight =
          t.weight != null && Number.isFinite(t.weight) ? formatWeight(t.weight) : null;
        const groupSlug = t.group_slug?.trim() || null;
        const groupName = t.group_name?.trim() || null;
        return (
          <li key={slug} className={styles.row}>
            <div>
              <Link href={`/themes/${encodeURIComponent(slug)}`} className={styles.link}>
                {t.name || slug}
              </Link>
              {groupName ? (
                <p className={styles.meta}>
                  {groupSlug ? (
                    <Link
                      href={`/groups/${encodeURIComponent(groupSlug)}`}
                      className={styles.groupLink}
                    >
                      {groupName}
                    </Link>
                  ) : (
                    groupName
                  )}
                </p>
              ) : null}
            </div>
            {weight ? <span className={styles.weight}>{weight}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
