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
