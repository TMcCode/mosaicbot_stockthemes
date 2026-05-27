export type HomeTopMoverItemV0 = {
  slug: string;
  name: string;
  return_pct: number;
  tier: "top" | "bottom";
  rank: number;
};

export type HomeTopMoversV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  movers_1d: HomeTopMoverItemV0[];
  movers_10d: HomeTopMoverItemV0[];
};
