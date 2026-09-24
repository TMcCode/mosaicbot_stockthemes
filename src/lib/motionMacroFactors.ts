import {
  FACTOR_MAKEUP_AXIS_IDS,
  FACTOR_MAKEUP_SHORT_LABELS,
  type FactorMakeupAxisId,
} from "@/lib/factorMakeupAxes";

/**
 * Eleven curated factor spreads for Themes in Motion macro chart
 * (makeup axes minus Meme — keeps parity with the 11 GICS sector SPDRs).
 */
export const MOTION_MACRO_FACTOR_IDS = FACTOR_MAKEUP_AXIS_IDS.filter(
  (id): id is FactorMakeupAxisId => id !== "MEME_SENSITIVITY",
);

export const MOTION_MACRO_FACTOR_SHORT_LABELS: Record<
  (typeof MOTION_MACRO_FACTOR_IDS)[number],
  string
> = Object.fromEntries(
  MOTION_MACRO_FACTOR_IDS.map((id) => [id, FACTOR_MAKEUP_SHORT_LABELS[id]]),
) as Record<(typeof MOTION_MACRO_FACTOR_IDS)[number], string>;
