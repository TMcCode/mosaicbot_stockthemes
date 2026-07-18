import type {
  ConstituentPriceReturnsV0,
  ThemeCompareReturnsV0,
} from "@/types/theme.detail.v0";

export type ThemePriceReturnsConstituentV0 = {
  ticker: string;
  price_returns: ConstituentPriceReturnsV0;
};

export type ThemePriceReturnsSidecarV0 = {
  schema_version: "theme.price_returns.v0";
  slug: string;
  name: string;
  as_of: string;
  ticker_performance_as_of?: string;
  build_id?: string;
  constituents: ThemePriceReturnsConstituentV0[];
  compare_returns?: ThemeCompareReturnsV0;
};
