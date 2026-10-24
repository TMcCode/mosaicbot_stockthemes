"use client";

import { useEffect, useState } from "react";

import {
  enrichFactorProfileRanks,
  factorLeaderboardsUrl,
  factorProfileHasContent,
  factorProfileNeedsLeaderboardEnrich,
  factorProfileUiAllowed,
  parseFactorLeaderboards,
  parseThemeFactorProfile,
  themeFactorProfileUrl,
} from "@/lib/themeFactorProfile";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import type { ThemeFactorProfileV0 } from "@/types/theme.factor_profile.v0";

export type ThemeFactorProfileState =
  | { status: "loading" }
  | { status: "absent" }
  | { status: "low_confidence"; profile: ThemeFactorProfileV0 }
  | { status: "ok"; profile: ThemeFactorProfileV0 }
  | { status: "error" };

export function resolveThemeFactorProfileState(profile: ThemeFactorProfileV0): ThemeFactorProfileState {
  if (!factorProfileHasContent(profile)) {
    return { status: "absent" };
  }
  if (!factorProfileUiAllowed(profile)) {
    return { status: "low_confidence", profile };
  }
  return { status: "ok", profile };
}

type Args = {
  slug: string;
  dataBaseUrl: string;
  initialProfile?: ThemeFactorProfileV0 | null;
  /** When false, skip fetch and stay idle/absent. */
  enabled?: boolean;
};

/**
 * Shared factor-profile load path for hero card + mobile thesis deck.
 */
export function useThemeFactorProfileState({
  slug,
  dataBaseUrl,
  initialProfile = null,
  enabled = true,
}: Args): ThemeFactorProfileState {
  const [state, setState] = useState<ThemeFactorProfileState>({ status: "loading" });

  useEffect(() => {
    if (!enabled) {
      setState({ status: "absent" });
      return;
    }

    let cancelled = false;

    const applyProfile = (profile: ThemeFactorProfileV0) => {
      if (cancelled) return;
      setState(resolveThemeFactorProfileState(profile));
    };

    if (initialProfile) {
      applyProfile(initialProfile);
    }

    const shouldLiveFetch =
      Boolean(dataBaseUrl.trim()) &&
      (process.env.NODE_ENV === "development" || !initialProfile);

    if (!shouldLiveFetch) {
      if (!initialProfile) {
        setState({ status: "absent" });
      }
      return;
    }

    const buster = stockthemesBrowserCacheBusterQuery();
    const profileUrl = `${themeFactorProfileUrl(dataBaseUrl, slug)}?${buster}`;

    fetch(profileUrl, {
      credentials: "omit",
      cache: stockthemesBrowserFetchCache(),
    })
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`profile HTTP ${res.status}`);
        return res.text();
      })
      .then(async (profileRaw) => {
        if (cancelled) return;
        if (!profileRaw) {
          if (!initialProfile) setState({ status: "absent" });
          return;
        }
        let profile = parseThemeFactorProfile(profileRaw);
        if (factorProfileNeedsLeaderboardEnrich(profile)) {
          const boardsUrl = `${factorLeaderboardsUrl(dataBaseUrl)}?${buster}`;
          let boardsRaw: string | null = null;
          try {
            const boardsRes = await fetch(boardsUrl, {
              credentials: "omit",
              cache: stockthemesBrowserFetchCache(),
            });
            boardsRaw = boardsRes.ok ? await boardsRes.text() : null;
          } catch {
            boardsRaw = null;
          }
          if (cancelled) return;
          let leaderboards = null;
          if (boardsRaw) {
            try {
              leaderboards = parseFactorLeaderboards(boardsRaw);
            } catch {
              leaderboards = null;
            }
          }
          profile = enrichFactorProfileRanks(profile, slug, leaderboards);
        }
        if (cancelled) return;
        applyProfile(profile);
      })
      .catch(() => {
        if (!cancelled && !initialProfile) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [slug, dataBaseUrl, initialProfile, enabled]);

  return state;
}
