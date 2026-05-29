import { cache } from "react";

import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import {
  FACTOR_PROFILE_SIDECAR_SUFFIX,
  parseThemeFactorProfile,
} from "@/lib/themeFactorProfile";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { ThemeFactorProfileV0 } from "@/types/theme.factor_profile.v0";

async function loadLiveThemeFactorProfile(slug: string): Promise<ThemeFactorProfileV0 | null> {
  const base = stockthemesPublicDataBase();
  if (!base) return null;
  const rel = `themes/${slug}${FACTOR_PROFILE_SIDECAR_SUFFIX}`;
  const url = `${base}/themes/${encodeURIComponent(slug)}${FACTOR_PROFILE_SIDECAR_SUFFIX}`;
  try {
    const raw = await fetchPublicJsonText(url, rel);
    return parseThemeFactorProfile(raw);
  } catch {
    return null;
  }
}

export const getThemeFactorProfileCached = cache(async (slug: string): Promise<ThemeFactorProfileV0 | null> => {
  return loadLiveThemeFactorProfile(slug);
});
