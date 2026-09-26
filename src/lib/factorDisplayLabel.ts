/** Canonical UI labels; applied over published JSON until the next ETL publish. */
const FACTOR_DISPLAY_LABELS: Partial<Record<string, string>> = {
  MEME_RETAIL: "Retail Speculation Exposure",
};

export function factorDisplayLabel(factorId: string, publishedLabel?: string): string {
  return FACTOR_DISPLAY_LABELS[factorId] ?? publishedLabel?.trim() ?? factorId;
}

/** Compact label for tight layouts (drops trailing “Exposure”). */
export function factorDisplayLabelShort(factorId: string, publishedLabel?: string): string {
  return factorDisplayLabel(factorId, publishedLabel).replace(/\s+Exposure$/i, "").trim();
}
