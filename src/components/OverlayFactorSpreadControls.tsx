"use client";

import { CheckboxMultiSelectDropdown } from "@/components/CheckboxMultiSelectDropdown";
import type { OverlayFactorSpreadOption } from "@/lib/overlayFactorSpreads";

import styles from "./OverlaySectorEtfControls.module.css";

type Props = {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  options: OverlayFactorSpreadOption[];
  selectedFactorIds: string[];
  onSelectedFactorIdsChange: (next: string[]) => void;
  maxSelectable: number;
  loading?: boolean;
};

export function OverlayFactorSpreadControls({
  enabled,
  onEnabledChange,
  options,
  selectedFactorIds,
  onSelectedFactorIdsChange,
  maxSelectable,
  loading = false,
}: Props) {
  const optionIds = options.map((o) => o.factorId);
  const idToLabel = new Map(options.map((o) => [o.factorId, o.name]));
  const labelToId = new Map(options.map((o) => [o.name, o.factorId]));
  const selectedNames = selectedFactorIds.map((id) => idToLabel.get(id) ?? id);
  const optionNames = optionIds.map((id) => idToLabel.get(id) ?? id);

  const onNamesChange = (names: string[]) => {
    const ids: string[] = names.flatMap((n) => {
      const id = labelToId.get(n);
      return id ? [id] : [];
    });
    onSelectedFactorIdsChange(ids.slice(0, Math.max(0, maxSelectable)));
  };

  const atCap =
    maxSelectable >= 0 &&
    selectedFactorIds.length >= maxSelectable &&
    maxSelectable < optionIds.length;

  return (
    <div className={styles.wrap}>
      <label className={styles.enableToggle}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        Factor Spreads
      </label>
      {enabled ? (
        <CheckboxMultiSelectDropdown
          label="Factors"
          options={optionNames}
          selected={selectedNames}
          onChange={onNamesChange}
          emptyLabel={loading ? "Loading…" : "Choose factors"}
          layout="inline"
          compact
        />
      ) : null}
      {enabled && atCap ? (
        <span className={styles.capHint} title="Factor spreads count toward the 12-series limit">
          Chart full
        </span>
      ) : null}
    </div>
  );
}
