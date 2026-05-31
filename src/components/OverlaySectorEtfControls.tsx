"use client";

import { CheckboxMultiSelectDropdown } from "@/components/CheckboxMultiSelectDropdown";
import {
  OVERLAY_SECTOR_SPDR_OPTIONS,
  type OverlaySectorEtfOption,
} from "@/lib/overlaySectorEtfs";

import styles from "./OverlaySectorEtfControls.module.css";

type Props = {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  selectedTickers: string[];
  onSelectedTickersChange: (next: string[]) => void;
  maxSelectable: number;
  availableTickers: Set<string>;
};

const OPTION_BY_TICKER = new Map<string, OverlaySectorEtfOption>(
  OVERLAY_SECTOR_SPDR_OPTIONS.map((o) => [o.ticker, o]),
);

function optionLabel(ticker: string): string {
  return OPTION_BY_TICKER.get(ticker)?.name ?? ticker;
}

export function OverlaySectorEtfControls({
  enabled,
  onEnabledChange,
  selectedTickers,
  onSelectedTickersChange,
  maxSelectable,
  availableTickers,
}: Props) {
  const options = OVERLAY_SECTOR_SPDR_OPTIONS.filter((o) => availableTickers.has(o.ticker)).map(
    (o) => o.ticker,
  );
  const selectedNames = selectedTickers.map(optionLabel);
  const optionNames = options.map(optionLabel);
  const nameToTicker = new Map(options.map((t) => [optionLabel(t), t]));

  const onNamesChange = (names: string[]) => {
    const tickers = names
      .map((n) => nameToTicker.get(n))
      .filter((t): t is string => Boolean(t));
    const capped = tickers.slice(0, Math.max(0, maxSelectable));
    onSelectedTickersChange(capped);
  };

  const atSectorCap =
    maxSelectable >= 0 &&
    selectedTickers.length >= maxSelectable &&
    maxSelectable < OVERLAY_SECTOR_SPDR_OPTIONS.length;

  return (
    <div className={styles.wrap}>
      <label className={styles.enableToggle}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        Sector SPDRs
      </label>
      {enabled ? (
        <CheckboxMultiSelectDropdown
          label="Sectors"
          options={optionNames}
          selected={selectedNames}
          onChange={onNamesChange}
          emptyLabel="Choose sectors"
          layout="inline"
          compact
        />
      ) : null}
      {enabled && atSectorCap ? (
        <span className={styles.capHint} title="Sector SPDRs count toward the 12-series limit">
          Chart full
        </span>
      ) : null}
    </div>
  );
}
