"use client";

import Link from "next/link";

import {
  COMPARE_SUMMARY_PERIODS,
  computeComparePeriodSummary,
  type CompareGroupExtreme,
  type CompareSummaryPeriod,
} from "@/lib/comparePeriodSummary";
import { trendingReturnHeatStyle } from "@/lib/trendingPerfHeat";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

import styles from "./CompareSummaryPanel.module.css";

type Row = {
  slug: string;
  name: string;
  groupSlug?: string | null;
  groupName?: string | null;
  compareReturns?: ThemeCompareReturnsV0 | null;
};

type Props = {
  rows: Row[];
  period: CompareSummaryPeriod;
  onPeriodChange: (period: CompareSummaryPeriod) => void;
  availablePeriods: CompareSummaryPeriod[];
  entityKind?: "theme" | "group";
};

function fmtPct(v?: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function summaryMetaLine(
  filteredCount: number,
  withDataCount: number,
  periodLabel: string,
  positivePct: number | null,
  entityKind: "theme" | "group",
): string {
  const plural = entityKind === "group" ? "groups" : "themes";
  const positive =
    positivePct != null ? ` · ${Math.round(positivePct)}% positive` : "";
  if (withDataCount === 0) {
    return `No ${plural} with ${periodLabel}% in this filter`;
  }
  if (withDataCount >= filteredCount) {
    return `${filteredCount.toLocaleString()} ${plural}${positive}`;
  }
  return `${withDataCount.toLocaleString()} of ${filteredCount.toLocaleString()} ${plural} with ${periodLabel}%${positive}`;
}

function GroupLine({ label, group }: { label: string; group: CompareGroupExtreme }) {
  return (
    <li>
      <span className={styles.detailLabel}>{label}</span>
      {group.slug ? (
        <Link href={`/groups/${group.slug}`} className={styles.detailLink}>
          {group.name}
        </Link>
      ) : (
        <span className={styles.detailLinkMuted}>{group.name}</span>
      )}
      <span className={styles.detailValue}>
        ({fmtPct(group.median)} median, {group.themeCount} themes)
      </span>
    </li>
  );
}

function ExtremeLine({
  label,
  slug,
  name,
  value,
  entityKind,
}: {
  label: string;
  slug: string;
  name: string;
  value: number;
  entityKind: "theme" | "group";
}) {
  return (
    <li>
      <span className={styles.detailLabel}>{label}</span>
      {slug ? (
        <Link href={`/${entityKind === "group" ? "groups" : "themes"}/${slug}`} className={styles.detailLink}>
          {name}
        </Link>
      ) : (
        <span className={styles.detailLinkMuted}>{name}</span>
      )}
      <span className={styles.detailValue}>{fmtPct(value)}</span>
    </li>
  );
}

export function CompareSummaryPanel({
  rows,
  period,
  onPeriodChange,
  availablePeriods,
  entityKind = "theme",
}: Props) {
  const periods = COMPARE_SUMMARY_PERIODS.filter((p) => availablePeriods.includes(p.key));
  const activePeriod = periods.some((p) => p.key === period)
    ? period
    : (periods[0]?.key ?? "10D");

  const summary = computeComparePeriodSummary(rows, activePeriod);

  const medianHeat =
    summary.median != null && Number.isFinite(summary.median)
      ? trendingReturnHeatStyle(summary.median)
      : undefined;

  const periodLabel = periods.find((p) => p.key === activePeriod)?.label ?? activePeriod;

  return (
    <aside className={styles.panel} aria-label={`Filtered ${entityKind} return summary`}>
      <div>
        <span className={styles.toolbarLabel}>Summary</span>
        {periods.length > 1 ? (
          <div
            className={styles.toggle}
            role="group"
            aria-label="Return period for summary stats"
            style={{ marginTop: 6 }}
          >
            {periods.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={activePeriod === key ? styles.toggleActive : undefined}
                aria-pressed={activePeriod === key}
                onClick={() => onPeriodChange(key)}
              >
                {label}%
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.headlineBlock}>
        <div className={styles.medianLabel}>Median {periodLabel}%</div>
        <div className={styles.headlineRow}>
          <div className={styles.median} style={medianHeat}>
            {fmtPct(summary.median)}
          </div>
          <p className={styles.breadth}>
          <span className={styles.breadthUp}>{summary.up.toLocaleString()} up</span>
          {" · "}
          <span className={styles.breadthDown}>{summary.down.toLocaleString()} down</span>
          {summary.flat > 0 ? (
            <>
              {" · "}
              {summary.flat.toLocaleString()} flat
            </>
          ) : null}
          </p>
        </div>
      </div>

      <p className={styles.meta}>
        {summaryMetaLine(
          summary.filteredCount,
          summary.withDataCount,
          periodLabel,
          summary.positivePct,
          entityKind,
        )}
      </p>

      <ul className={styles.detailList}>
        {summary.best ? (
          <ExtremeLine
            label="Best"
            slug={summary.best.slug}
            name={summary.best.name}
            value={summary.best.value}
            entityKind={entityKind}
          />
        ) : null}
        {summary.worst ? (
          <ExtremeLine
            label="Worst"
            slug={summary.worst.slug}
            name={summary.worst.name}
            value={summary.worst.value}
            entityKind={entityKind}
          />
        ) : null}
        {entityKind === "theme" && summary.topGroup ? (
          <GroupLine label="Top group" group={summary.topGroup} />
        ) : null}
        {entityKind === "theme" &&
        summary.bottomGroup &&
        summary.bottomGroup.name !== summary.topGroup?.name ? (
          <GroupLine label="Bottom group" group={summary.bottomGroup} />
        ) : null}
      </ul>
    </aside>
  );
}
