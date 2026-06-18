export type RotationLongAxis = "YTD" | "Period";

/** Jan–Feb use trailing 1Yr; from March use YTD (matches compare table long horizon). */
export function pickRotationLongAxis(asOf: string | Date): RotationLongAxis {
  const d = typeof asOf === "string" ? new Date(asOf) : asOf;
  const month = Number.isFinite(d.getTime()) ? d.getUTCMonth() : 2;
  return month < 2 ? "Period" : "YTD";
}

export function rotationLongAxisLabel(axis: RotationLongAxis): string {
  return axis === "Period" ? "1Yr vs SPY" : "YTD vs SPY";
}

export function rotationShortAxisLabel(): string {
  return "10D vs SPY";
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
