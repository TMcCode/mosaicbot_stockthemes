"use client";

import { useEffect, useMemo, useState } from "react";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { formatWeight } from "@/lib/formatWeight";
import { fetchStockAppBrowser, mergeStockDetailWithApp } from "@/lib/mergeStockApp";
import { fetchTickerWhatTheyDo } from "@/lib/fetchTickerWhatTheyDo";
import { rotationThemeLabelSuffix, themeDisplayLabel } from "@/lib/rotationThemeLabel";
import type {
  StockDetailV0,
  StockThemeMembershipAppV0,
  StockThemeMembershipPublicV0,
} from "@/types/stock.detail.v0";

import styles from "./StockSignedInHeroHint.module.css";

const DESK_HINT = "Earnings · Revenue · Rev Revisions · Quality & Risk · Notes below";

type Props = {
  ticker: string;
  themes: StockThemeMembershipPublicV0[] | StockThemeMembershipAppV0[];
  dataBaseUrl?: string;
  hydrateTierB?: boolean;
};

function shortThemeLabel(theme: StockThemeMembershipPublicV0): string {
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
 * Signed-in stock hero under chips: plain-English what-they-do (when published),
 * membership summary, and a soft desk hint when overview is missing.
 */
export function StockSignedInHeroHint({
  ticker,
  themes: themesProp,
  dataBaseUrl = "",
  hydrateTierB,
}: Props) {
  const { configured, showAuthedUi } = useSupabaseAuth();
  const clientTierB = hydrateTierB ?? Boolean(dataBaseUrl);
  const themeShellKey = themesProp.map((t) => t.slug).join("|");
  const [themes, setThemes] = useState<StockThemeMembershipAppV0[]>(() =>
    themesProp.map((t) => ({ ...t })),
  );
  const [whatTheyDo, setWhatTheyDo] = useState<string | null>(null);
  const [overviewChecked, setOverviewChecked] = useState(false);

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

  useEffect(() => {
    if (!configured || !showAuthedUi) return;
    let cancelled = false;
    setOverviewChecked(false);
    setWhatTheyDo(null);
    void (async () => {
      const text = await fetchTickerWhatTheyDo(ticker);
      if (cancelled) return;
      setWhatTheyDo(text);
      setOverviewChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, showAuthedUi, ticker]);

  const ordered = useMemo(() => sortThemes(themes), [themes]);
  const membershipLine = useMemo(() => {
    const n = ordered.length;
    if (n === 0) return null;
    const top = ordered[0];
    const label = shortThemeLabel(top);
    const w = top.weight != null && Number.isFinite(top.weight) ? top.weight : null;
    const heavy =
      w != null ? (
        <>
          heaviest: <span className={styles.membershipStrong}>{label}</span> ({formatWeight(w)})
        </>
      ) : (
        <>
          heaviest: <span className={styles.membershipStrong}>{label}</span>
        </>
      );
    return (
      <>
        In {n} theme{n === 1 ? "" : "s"} · {heavy}
      </>
    );
  }, [ordered]);

  if (!configured || !showAuthedUi) return null;
  if (!membershipLine && !whatTheyDo && !overviewChecked) return null;

  const showDeskHint = overviewChecked && !whatTheyDo;

  return (
    <div className={styles.heroSlot} aria-label="Stock context">
      {whatTheyDo ? <p className={styles.whatTheyDo}>{whatTheyDo}</p> : null}
      {membershipLine ? <p className={styles.membership}>{membershipLine}</p> : null}
      {showDeskHint ? <p className={styles.deskHint}>{DESK_HINT}</p> : null}
    </div>
  );
}
