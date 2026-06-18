import { compareColumnHeader } from "@/lib/trendingCompareMetrics";

export type RotationLongAxis = "YTD" | "Period";

/** Shortest → longest compare horizons usable on the rotation map. */
export const ROTATION_HORIZON_ORDER = ["1D", "10D", "MTD", "YTD", "Period"] as const;

export type RotationHorizonKey = (typeof ROTATION_HORIZON_ORDER)[number];

export const ROTATION_SHORT_AXIS_OPTIONS: readonly RotationHorizonKey[] = ["1D", "10D", "MTD"];

export const ROTATION_LONG_AXIS_OPTIONS: readonly RotationHorizonKey[] = ["MTD", "YTD", "Period"];

/** Jan–Feb use trailing 1Yr; from March use YTD (matches compare table long horizon). */
export function pickRotationLongAxis(asOf: string | Date): RotationLongAxis {
  const d = typeof asOf === "string" ? new Date(asOf) : asOf;
  const month = Number.isFinite(d.getTime()) ? d.getUTCMonth() : 2;
  return month < 2 ? "Period" : "YTD";
}

export function rotationAxisMetricLabel(metricKey: string): string {
  const header = compareColumnHeader(metricKey);
  return `${header} vs SPY`;
}

/** @deprecated Use rotationAxisMetricLabel("10D") */
export function rotationShortAxisLabel(): string {
  return rotationAxisMetricLabel("10D");
}

/** @deprecated Use rotationAxisMetricLabel(longAxis) */
export function rotationLongAxisLabel(axis: RotationLongAxis): string {
  return rotationAxisMetricLabel(axis);
}

export function resolveRotationAxisOptions(
  availableMetrics: ReadonlySet<string> | string[],
): { short: RotationHorizonKey[]; long: RotationHorizonKey[] } {
  const set = availableMetrics instanceof Set ? availableMetrics : new Set(availableMetrics);
  return {
    short: ROTATION_SHORT_AXIS_OPTIONS.filter((k) => set.has(k)),
    long: ROTATION_LONG_AXIS_OPTIONS.filter((k) => set.has(k)),
  };
}

export function defaultRotationShortAxis(
  available: readonly RotationHorizonKey[],
): RotationHorizonKey {
  if (available.includes("10D")) return "10D";
  return available[0] ?? "10D";
}

export function defaultRotationLongAxis(
  asOf: string,
  available: readonly RotationHorizonKey[],
): RotationHorizonKey {
  const preferred = pickRotationLongAxis(asOf);
  if (available.includes(preferred)) return preferred;
  if (available.includes("YTD")) return "YTD";
  if (available.includes("Period")) return "Period";
  return available[0] ?? "YTD";
}

export function isValidRotationAxisPair(
  shortKey: RotationHorizonKey,
  longKey: RotationHorizonKey,
): boolean {
  const si = ROTATION_HORIZON_ORDER.indexOf(shortKey);
  const li = ROTATION_HORIZON_ORDER.indexOf(longKey);
  return si >= 0 && li > si;
}

export function coerceRotationLongAxis(
  shortKey: RotationHorizonKey,
  longKey: RotationHorizonKey,
  availableLong: readonly RotationHorizonKey[],
): RotationHorizonKey {
  const si = ROTATION_HORIZON_ORDER.indexOf(shortKey);
  const valid = availableLong.filter((k) => ROTATION_HORIZON_ORDER.indexOf(k) > si);
  if (valid.length === 0) return longKey;
  if (valid.includes(longKey) && isValidRotationAxisPair(shortKey, longKey)) return longKey;
  return valid[0];
}

export function coerceRotationShortAxis(
  shortKey: RotationHorizonKey,
  longKey: RotationHorizonKey,
  availableShort: readonly RotationHorizonKey[],
): RotationHorizonKey {
  const li = ROTATION_HORIZON_ORDER.indexOf(longKey);
  const valid = availableShort.filter((k) => ROTATION_HORIZON_ORDER.indexOf(k) < li);
  if (valid.length === 0) return shortKey;
  if (valid.includes(shortKey) && isValidRotationAxisPair(shortKey, longKey)) return shortKey;
  return valid[valid.length - 1];
}

/**
 * Longer short-horizon used as the tail of motion arrows (rotation into current X).
 * e.g. 10D current position ← from MTD on the same long axis.
 */
export function rotationMotionPriorShort(shortKey: string): RotationHorizonKey | null {
  const idx = ROTATION_HORIZON_ORDER.indexOf(shortKey as RotationHorizonKey);
  if (idx <= 0) return null;
  if (shortKey === "10D") return "MTD";
  if (shortKey === "1D") return "10D";
  if (shortKey === "MTD") return "10D";
  return ROTATION_HORIZON_ORDER[idx - 1] ?? null;
}

/** Pick a "nice" step so a span yields roughly 6–8 tick marks. */
export function rotationAxisTickStep(span: number): number {
  const absSpan = Math.abs(span);
  if (!Number.isFinite(absSpan) || absSpan <= 0) return 1;
  const rough = absSpan / 7;
  const exp = Math.floor(Math.log10(rough));
  const pow = 10 ** exp;
  const f = rough / pow;
  let nice: number;
  if (f <= 1) nice = 1;
  else if (f <= 2) nice = 2;
  else if (f <= 2.5) nice = 2.5;
  else if (f <= 5) nice = 5;
  else nice = 10;
  return nice * pow;
}

export function rotationAxisTicks(min: number, max: number): number[] {
  const span = max - min;
  const step = rotationAxisTickStep(span);
  const ticks: number[] = [];
  const start = Math.floor(min / step) * step;
  for (let v = start; v <= max + step * 0.001; v += step) {
    ticks.push(Math.round(v * 100) / 100);
  }
  return ticks;
}

export function formatRotationAxisTick(v: number, span: number): string {
  if (!Number.isFinite(v)) return "";
  const sign = v > 0 ? "+" : "";
  const useWhole = Math.abs(v) >= 100 || span >= 50;
  return `${sign}${useWhole ? Math.round(v) : v.toFixed(1)}%`;
}
