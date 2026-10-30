/**
 * Manual ThemeWgt mean over available values; renormalize to weights that have a value.
 * Falls back to equal-weight when no positive weights are present.
 */
export function weightedMeanRenormalized(
  pairs: Array<{ weight: number | null | undefined; value: number | null | undefined }>,
): number | null {
  let numer = 0;
  let denom = 0;
  const unweighted: number[] = [];
  for (const { weight, value } of pairs) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    unweighted.push(value);
    if (typeof weight === "number" && Number.isFinite(weight) && weight > 0) {
      numer += weight * value;
      denom += weight;
    }
  }
  if (denom > 0) return numer / denom;
  if (!unweighted.length) return null;
  return unweighted.reduce((sum, v) => sum + v, 0) / unweighted.length;
}
