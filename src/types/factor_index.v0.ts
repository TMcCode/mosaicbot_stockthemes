export type FactorIndexBucketV0 = {
  label: string;
  total: number;
};

export type FactorIndexV0 = {
  schema_version: "factor_index.v0";
  as_of?: string | null;
  generated_at?: string | null;
  factors: Record<string, FactorIndexBucketV0>;
};

