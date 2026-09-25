"use client";

import {
  DETAIL_CHART_STANDARD_PERIODS,
  type ChartCustomPeriod,
  type OverlayChartPeriod,
  type OverlayStandardPeriod,
} from "@/lib/chartPeriodControls";
import { OVERLAY_STANDARD_PERIODS } from "@/lib/sliceIndexedChart";

import styles from "./Chart1yPanel.module.css";

type Props = {
  period: OverlayChartPeriod;
  onPeriodChange: (period: OverlayChartPeriod) => void;
  supportedPeriods: Set<OverlayStandardPeriod>;
  supportedCustomPeriodKeys: Set<string>;
  customPeriods: ChartCustomPeriod[];
  /** Use compact set (no 5Y) for theme/group detail charts. */
  variant?: "detail" | "overlay";
  /** Download PNG chip — placed after custom event dates (or after standards if none). */
  onDownloadPng?: () => void;
  downloadBusy?: boolean;
};

export function ChartPeriodToolbar({
  period,
  onPeriodChange,
  supportedPeriods,
  supportedCustomPeriodKeys,
  customPeriods,
  variant = "detail",
  onDownloadPng,
  downloadBusy = false,
}: Props) {
  const standardPeriods =
    variant === "detail" ? DETAIL_CHART_STANDARD_PERIODS : OVERLAY_STANDARD_PERIODS;

  const downloadBtn =
    onDownloadPng != null ? (
      <button
        type="button"
        className={styles.periodBtn}
        disabled={downloadBusy}
        title="Download chart PNG"
        aria-label="Download chart PNG"
        onClick={onDownloadPng}
      >
        <svg
          className={styles.downloadIcon}
          width="12"
          height="12"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="currentColor"
            d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V2.25A.75.75 0 0 1 8 1.5ZM2.5 11a.75.75 0 0 1 .75.75v1.5h9.5v-1.5a.75.75 0 0 1 1.5 0v2.25a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V11.75A.75.75 0 0 1 2.5 11Z"
          />
        </svg>
      </button>
    ) : null;

  return (
    <div className={styles.periodControls} role="group" aria-label="Chart period">
      <div className={styles.periodRow}>
        {standardPeriods.map((p) => {
          const disabled = !supportedPeriods.has(p);
          return (
            <button
              key={p}
              type="button"
              className={period === p ? styles.periodBtnActive : styles.periodBtn}
              disabled={disabled}
              title={
                disabled
                  ? "Loaded series do not have enough history for this window yet"
                  : undefined
              }
              onClick={() => onPeriodChange(p)}
            >
              {p}
            </button>
          );
        })}
        {customPeriods.length === 0 ? downloadBtn : null}
      </div>
      {customPeriods.length > 0 ? (
        <div className={styles.periodRowCustom} role="group" aria-label="Custom event dates">
          {customPeriods.map((c) => {
            const disabled = !supportedCustomPeriodKeys.has(c.key);
            return (
              <button
                key={c.key}
                type="button"
                className={period === c.key ? styles.periodBtnActive : styles.periodBtn}
                disabled={disabled}
                title={
                  disabled
                    ? `${c.date}: loaded series do not include this date yet`
                    : c.date
                }
                onClick={() => onPeriodChange(c.key)}
              >
                {c.label}
              </button>
            );
          })}
          {downloadBtn}
        </div>
      ) : null}
    </div>
  );
}
