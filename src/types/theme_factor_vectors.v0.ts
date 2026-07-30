export type ThemeFactorVectorAxisV0 = {
  id: string;
  label: string;
};

export type ThemeFactorVectorRowV0 = {
  name: string;
  /** Co-movement scores 0–100, aligned to `axes` (null = missing). */
  scores: Array<number | null>;
  /** Co-movement ranks aligned to `axes` (null = missing). */
  ranks?: Array<number | null>;
  /** Universe size for ranks (same across axes). */
  total?: number | null;
};

export type ThemeFactorVectorsV0 = {
  schema_version: "theme_factor_vectors.v0";
  as_of?: string | null;
  generated_at?: string | null;
  axes: ThemeFactorVectorAxisV0[];
  themes: Record<string, ThemeFactorVectorRowV0>;
};
