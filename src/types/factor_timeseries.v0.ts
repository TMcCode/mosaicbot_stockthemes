export type FactorTimeseriesBucketV0 = {
  label: string;
  dates: string[];
  values: number[];
};

export type FactorTimeseriesV0 = {
  schema_version: "factor_timeseries.v0";
  as_of?: string | null;
  generated_at?: string | null;
  /** Trading-day lookback used when the bundle was built (~260 short / ~1300 long). */
  lookback_points?: number | null;
  factors: Record<string, FactorTimeseriesBucketV0>;
};

