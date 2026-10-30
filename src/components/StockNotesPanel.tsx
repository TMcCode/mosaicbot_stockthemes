"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { ConstituentsTableSortHint } from "@/components/ConstituentsTableSortHint";
import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
import { TableFooterBrandMark } from "@/components/TableFooterBrandMark";
import type { StockMembershipNotesState } from "@/hooks/useStockMembershipNotes";
import {
  compareNullableNumbers,
  compareText,
  DEFAULT_CONSTITUENT_SORT,
  toggleConstituentSort,
  type ConstituentSortState,
} from "@/lib/constituentTableSort";
import { formatWeight } from "@/lib/formatWeight";

import pageStyles from "@/app/page.module.css";
import tableStyles from "@/components/ThemeConstituentsTable.module.css";
import styles from "./StockLensPanels.module.css";

type MembershipTheme = {
  slug: string;
  name: string;
  weight?: number | null;
};

type Props = {
  ticker: string;
  membershipThemes: MembershipTheme[];
  notesState: StockMembershipNotesState;
};

export function StockNotesPanel({ ticker, membershipThemes, notesState }: Props) {
  const [sorts, setSorts] = useState<ConstituentSortState[]>(DEFAULT_CONSTITUENT_SORT);
  const activeSortKeys = useMemo(() => new Set(sorts.map((s) => s.key)), [sorts]);

  const bySlug = notesState.status === "ok" ? notesState.bySlug : {};
  const hasWeight = membershipThemes.some((t) => t.weight != null && Number.isFinite(t.weight));

  const sortedThemes = useMemo(() => {
    const rows = [...membershipThemes];
    rows.sort((a, b) => {
      for (const s of sorts) {
        if (s.key === "theme") {
          const c = compareText(a.name, b.name, s.dir);
          if (c !== 0) return c;
          continue;
        }
        if (s.key === "weight") {
          const c = compareNullableNumbers(
            a.weight != null && Number.isFinite(a.weight) ? a.weight : null,
            b.weight != null && Number.isFinite(b.weight) ? b.weight : null,
            s.dir,
          );
          if (c !== 0) return c;
          continue;
        }
        if (s.key === "ticker_note") {
          const c = compareText(bySlug[a.slug] ?? "", bySlug[b.slug] ?? "", s.dir);
          if (c !== 0) return c;
        }
      }
      return 0;
    });
    return rows;
  }, [membershipThemes, sorts, bySlug]);

  const onHeaderClick = (key: string, shiftKey: boolean) => {
    setSorts((prev) => toggleConstituentSort(prev, key, shiftKey));
  };

  const renderSortHead = (key: string, label: ReactNode, title?: string) => (
    <button
      type="button"
      className={`${tableStyles.sortHead} ${activeSortKeys.has(key) ? tableStyles.sortHeadActive : ""}`}
      onClick={(e) => onHeaderClick(key, e.shiftKey)}
      onPointerDown={(e) => e.stopPropagation()}
      title={title}
    >
      {label}
    </button>
  );

  const statusHint =
    notesState.status === "loading" || notesState.status === "idle"
      ? "Loading membership notes…"
      : notesState.status === "error"
        ? "Could not load membership notes."
        : notesState.status === "ok" && !notesState.anyNotes
          ? "No membership notes published for this ticker’s themes yet."
          : null;

  return (
    <>
      {statusHint ? <p className={styles.liveHint}>{statusHint}</p> : null}
      <div className={pageStyles.tableWrap}>
        <HorizontalScrollArea
          className={pageStyles.constituentsScrollWrap}
          data-constituents-view="notes"
          tabIndex={0}
          role="region"
          aria-label={`${ticker} membership notes by theme`}
        >
          <div className={pageStyles.constituentsTableSizer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  <th scope="col">{renderSortHead("theme", "Theme")}</th>
                  {hasWeight ? (
                    <th scope="col" className={tableStyles.metaCol}>
                      {renderSortHead("weight", "Wgt")}
                    </th>
                  ) : null}
                  <th
                    scope="col"
                    className={tableStyles.notesColumnHead}
                    title={`Why ${ticker} is in each theme`}
                  >
                    {renderSortHead(
                      "ticker_note",
                      "Rationale",
                      `Why ${ticker} is in each theme`,
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedThemes.map((t) => {
                  const note = bySlug[t.slug];
                  let cell: ReactNode = "—";
                  if (notesState.status === "loading" || notesState.status === "idle") {
                    cell = "…";
                  } else if (notesState.status === "error") {
                    cell = "Unavailable";
                  } else if (note) {
                    cell = note;
                  }
                  return (
                    <tr key={t.slug}>
                      <td>
                        <Link href={`/themes/${encodeURIComponent(t.slug)}`}>{t.name}</Link>
                      </td>
                      {hasWeight ? (
                        <td className={`${tableStyles.metaCol} ${styles.wgtCell}`}>
                          {t.weight != null && Number.isFinite(t.weight)
                            ? formatWeight(t.weight)
                            : "—"}
                        </td>
                      ) : null}
                      <td className={pageStyles.noteCell}>{cell}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </HorizontalScrollArea>
        <div className={pageStyles.tableFooter}>
          <p className={pageStyles.tableFootnote}>
            Membership rationale for {ticker} in each theme (same notes as the theme Notes tab).
          </p>
          <ConstituentsTableSortHint showScrollHint={false} />
          <TableFooterBrandMark className={pageStyles.tableWatermark} />
        </div>
      </div>
    </>
  );
}
