"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatWeight } from "@/lib/formatWeight";
import { fetchStockAppBrowser, mergeStockDetailWithApp } from "@/lib/mergeStockApp";
import { rotationThemeLabelSuffix, themeDisplayLabel } from "@/lib/rotationThemeLabel";
import type {
  StockDetailV0,
  StockThemeMembershipAppV0,
  StockThemeMembershipPublicV0,
} from "@/types/stock.detail.v0";

import styles from "./StockMembershipChips.module.css";

/** Hero chips: top N by weight; rest behind “+N more”. */
const VISIBLE_CHIP_LIMIT = 10;
/** Warm the heaviest themes on idle so the first click feels instant. */
const IDLE_PREFETCH_COUNT = 3;

type Props = {
  ticker: string;
  themes: StockThemeMembershipPublicV0[] | StockThemeMembershipAppV0[];
  /** When set with hydrateTierB, fetch weights from Tier B `.app` (same as treemap). */
  dataBaseUrl?: string;
  hydrateTierB?: boolean;
};

function chipLabel(theme: StockThemeMembershipPublicV0): string {
  const name = theme.name || theme.slug;
  const group = theme.group_name?.trim() || null;
  const suffix = group ? rotationThemeLabelSuffix(name, group) : "";
  if (suffix) return suffix;
  return themeDisplayLabel(name) || name;
}

function sortThemes(themes: StockThemeMembershipAppV0[]): StockThemeMembershipAppV0[] {
  return [...themes].sort((a, b) => {
    const aw = a.weight != null && Number.isFinite(a.weight) ? a.weight : -1;
    const bw = b.weight != null && Number.isFinite(b.weight) ? b.weight : -1;
    if (bw !== aw) return bw - aw;
    return (a.name || a.slug).localeCompare(b.name || b.slug);
  });
}

/**
 * Stock hero membership chips → theme pages.
 * Visible to guests and signed-in users; weights hydrate from Tier B when available.
 */
export function StockMembershipChips({
  ticker,
  themes: themesProp,
  dataBaseUrl = "",
  hydrateTierB,
}: Props) {
  const router = useRouter();
  const prefetchedRef = useRef<Set<string>>(new Set());
  const clientTierB = hydrateTierB ?? Boolean(dataBaseUrl);
  const themeShellKey = themesProp.map((t) => t.slug).join("|");
  const [themes, setThemes] = useState<StockThemeMembershipAppV0[]>(() =>
    themesProp.map((t) => ({ ...t })),
  );

  const prefetchTheme = useCallback(
    (href: string) => {
      if (prefetchedRef.current.has(href)) return;
      prefetchedRef.current.add(href);
      void router.prefetch(href);
    },
    [router],
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
      const app = await fetchStockAppBrowser(ticker);
      if (!app || cancelled) return;
      const merged = mergeStockDetailWithApp(shell, app);
      if (!cancelled) setThemes(merged.themes);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- themeShellKey stands in for themesProp
  }, [clientTierB, dataBaseUrl, ticker, themeShellKey]);

  const ordered = useMemo(() => sortThemes(themes), [themes]);
  const [expanded, setExpanded] = useState(false);

  // After paint / Tier B weight sort: prefetch top themes so chip clicks feel warm.
  useEffect(() => {
    if (ordered.length === 0) return;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const run = () => {
      for (const t of ordered.slice(0, IDLE_PREFETCH_COUNT)) {
        const slug = t.slug?.trim();
        if (!slug) continue;
        prefetchTheme(`/themes/${encodeURIComponent(slug)}`);
      }
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(run, 400);
    }
    return () => {
      if (idleId != null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [ordered, prefetchTheme]);

  if (ordered.length === 0) return null;

  const hasAnyWeight = ordered.some((t) => t.weight != null && Number.isFinite(t.weight));
  const hiddenCount = Math.max(0, ordered.length - VISIBLE_CHIP_LIMIT);
  const visible = expanded || hiddenCount === 0 ? ordered : ordered.slice(0, VISIBLE_CHIP_LIMIT);

  return (
    <div className={styles.block}>
      <p className={styles.label}>{ticker} Themes</p>
      <div className={styles.wrap} aria-label={`${ticker} theme membership`}>
        {visible.map((t) => {
          const slug = t.slug?.trim();
          if (!slug) return null;
          const w = t.weight != null && Number.isFinite(t.weight) ? t.weight : null;
          const name = chipLabel(t);
          const href = `/themes/${encodeURIComponent(slug)}`;
          return (
            <Link
              key={slug}
              href={href}
              className={styles.chip}
              // Viewport prefetch alone often misses chips; hover/focus starts RSC early.
              onMouseEnter={() => prefetchTheme(href)}
              onFocus={() => prefetchTheme(href)}
              title={
                w != null
                  ? `${themeDisplayLabel(t.name || slug) || slug} · ${formatWeight(w)}`
                  : themeDisplayLabel(t.name || slug) || slug
              }
            >
              <span className={styles.chipName}>{name}</span>
              {hasAnyWeight ? (
                <span className={styles.chipWeight}>{w != null ? formatWeight(w) : "—"}</span>
              ) : null}
            </Link>
          );
        })}
        {hiddenCount > 0 ? (
          <button
            type="button"
            className={styles.more}
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : `+${hiddenCount} more`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
