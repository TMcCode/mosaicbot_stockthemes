import type { FactorLeaderboardsV0 } from "@/types/factor_leaderboards.v0";
import {
  buildThemeMakeupScoreIndex,
  loadFactorLeaderboards,
  loadThemeFactorMakeupBundle,
  type ThemeFactorMakeupBundle,
  type ThemeFactorMakeupScores,
} from "@/lib/loadThemeFactorVectors";

export type { ThemeFactorMakeupBundle, ThemeFactorMakeupScores };
export {
  buildThemeMakeupScoreIndex,
  loadFactorLeaderboards,
  loadThemeFactorMakeupBundle,
};
export type { FactorLeaderboardsV0 };
