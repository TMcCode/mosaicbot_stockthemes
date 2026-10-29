"use client";

import Link from "next/link";
import { useState } from "react";

import type { CloseMoversBoardPayload, CloseMoversBoardRow } from "@/lib/buildCloseMoversBoard";
import { trendingReturnHeatStyle } from "@/lib/trendingPerfHeat";

import styles from "./HomeCloseMoversBoard.module.css";

function fmtPct(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function ThemeRow({ row }: { row: CloseMoversBoardRow }) {
  const [newsOpen, setNewsOpen] = useState(false);
  const hasNews = row.headlines.length > 0;
  const heat =
    row.returnPct != null && Number.isFinite(row.returnPct)
      ? trendingReturnHeatStyle(row.returnPct)
      : undefined;

  return (
    <li className={styles.row}>
      <div className={styles.themeRow}>
        <Link
          href={`/themes/${encodeURIComponent(row.slug)}`}
          className={styles.themeLink}
          style={
            heat
              ? { backgroundColor: heat.backgroundColor, color: heat.color }
              : undefined
          }
        >
          <span className={styles.rank}>
            {row.tier === "top" ? `#${row.rank}` : `▼${row.rank}`}
          </span>
          <span className={styles.name}>{row.name}</span>
          <span className={styles.pct}>{fmtPct(row.returnPct)}</span>
        </Link>
        {hasNews ? (
          <button
            type="button"
            className={styles.newsToggle}
            aria-expanded={newsOpen}
            aria-controls={`close-mover-news-${row.tier}-${row.slug}`}
            aria-label={
              newsOpen
                ? `Hide news for ${row.name}`
                : `Show ${row.headlines.length} news for ${row.name}`
            }
            title={newsOpen ? "Hide news" : "Show news"}
            onClick={() => setNewsOpen((v) => !v)}
          >
            {newsOpen ? "−" : "+"}
          </button>
        ) : null}
      </div>
      {hasNews && newsOpen ? (
        <ul
          id={`close-mover-news-${row.tier}-${row.slug}`}
          className={styles.headlines}
        >
          {row.headlines.map((h) => (
            <li key={h.url} className={styles.headline}>
              <a href={h.url} target="_blank" rel="noopener noreferrer">
                {h.title}
                {h.sourceName ? (
                  <span className={styles.source}>· {h.sourceName}</span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

type Props = {
  board: CloseMoversBoardPayload;
};

/** Body only — lives inside the Top movers today shell when expanded. */
export function HomeCloseMoversBoard({ board }: Props) {
  return (
    <div id="home-close-movers-board" className={styles.columns}>
      <div className={styles.column}>
        <span className={styles.colLabel}>Top {board.top.length}</span>
        <ul className={styles.list}>
          {board.top.map((row) => (
            <ThemeRow key={`t-${row.slug}`} row={row} />
          ))}
        </ul>
      </div>
      <div className={styles.column}>
        <span className={styles.colLabel}>Bottom {board.bottom.length}</span>
        <ul className={styles.list}>
          {board.bottom.map((row) => (
            <ThemeRow key={`b-${row.slug}`} row={row} />
          ))}
        </ul>
      </div>
    </div>
  );
}
