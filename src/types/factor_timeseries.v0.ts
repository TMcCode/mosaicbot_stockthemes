export type FactorTimeseriesBucketV0 = {
  label: string;
  dates: string[];
  values: number[];
};

export type FactorTimeseriesV0 = {
  schema_version: "factor_timeseries.v0";
  as_of?: string | null;
  generated_at?: string | null;
  factors: Record<string, FactorTimeseriesBucketV0>;
};

