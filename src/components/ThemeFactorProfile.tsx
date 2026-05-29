"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import {
  enrichFactorProfileRanks,
  factorLeaderboardsUrl,
  factorProfileHasContent,
  factorProfileNeedsLeaderboardEnrich,
  factorProfileUiAllowed,
  formatFactorRankLabel,
  formatThemeFactorDisplayRank,
  parseFactorLeaderboards,
  parseThemeFactorProfile,
  themeFactorDisplayScore,
  themeFactorProfileUrl,
} from "@/lib/themeFactorProfile";
import { factorTooltipSummaryForId } from "@/lib/factorTooltipSummaries";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import type { ThemeFactorProfileV0, ThemeFactorScoreEntryV0 } from "@/types/theme.factor_profile.v0";

import styles from "./ThemeFactorProfile.module.css";

type Props = {
  slug: string;
  dataBaseUrl: string;
  /** Baked at static build from CDN/build cache — used in production without client fetch. */
  initialProfile?: ThemeFactorProfileV0 | null;
  /** Stretch panel to align bottom with hero treemap rail. */
  fillRail?: boolean;
  /** Return path after sign-in (e.g. `/themes/my-slug`). */
  signInNext?: string;
};

type ProfileState =
  | { status: "loading" }
  | { status: "absent" }
  | { status: "low_confidence"; profile: ThemeFactorProfileV0 }
  | { status: "ok"; profile: ThemeFactorProfileV0 }
  | { status: "error" };

function resolveProfileState(profile: ThemeFactorProfileV0): ProfileState {
  if (!factorProfileHasContent(profile)) {
    return { status: "absent" };
  }
  if (!factorProfileUiAllowed(profile)) {
    return { status: "low_confidence", profile };
  }
  return { status: "ok", profile };
}

function FactorRow({ entry, variant }: { entry: ThemeFactorScoreEntryV0; variant: "pos" | "neg" }) {
  const displayScore = themeFactorDisplayScore(entry);
  const rankLabel = formatThemeFactorDisplayRank(entry);
  const tooltipSummary = factorTooltipSummaryForId(entry.id);
  return (
    <li className={styles.row}>
      <div className={styles.rowHead}>
        <div className={styles.labelBlock}>
          <span
            className={styles.label}
            tabIndex={tooltipSummary ? 0 : undefined}
            aria-label={tooltipSummary ? `${entry.label}. ${tooltipSummary}` : undefined}
          >
            {entry.label}
            {tooltipSummary ? <span className={styles.tooltip}>{tooltipSummary}</span> : null}
          </span>
          {rankLabel ? <span className={styles.rank}>({rankLabel})</span> : null}
        </div>
        <span className={styles.score}>{displayScore}</span>
      </div>
      <div className={styles.barTrack} aria-hidden="true">
        <div
          className={`${styles.barFill} ${variant === "neg" ? styles.barFillNeg : ""}`}
          style={{ width: `${displayScore}%` }}
        />
      </div>
    </li>
  );
}

function FactorSignInPrompt({ signInNext }: { signInNext?: string }) {
  const signInHref = signInNext
    ? `/sign-in?next=${encodeURIComponent(signInNext)}`
    : "/sign-in";

  return (
    <div className={styles.locked} aria-label="Factor profile sign-in prompt">
      <p className={styles.lockedTitle}>Sign in to view factor exposure</p>
      <p className={styles.lockedCopy}>
        Free account — see how this theme ranks on market, sector, and narrative factors, and browse
        full factor leaderboards.
      </p>
      <div className={styles.lockedActions}>
        <Link href={signInHref} className={styles.signInBtn}>
          Sign in free
        </Link>
        <Link href="/factors" className={styles.secondaryLink}>
          About factor rankings
        </Link>
      </div>
    </div>
  );
}

function FactorProfileCard({ profile }: { profile: ThemeFactorProfileV0 }) {
  const pos = profile.factors_positive ?? [];
  const neg = profile.factors_negative ?? [];
  const industry = profile.dominant_sector;

  return (
    <div className={styles.panel}>
      <div className={styles.grid}>
        <div>
          <h3 className={`${styles.colTitle} ${styles.colTitlePos}`}>Higher exposure</h3>
          {pos.length ? (
            <ul className={styles.list}>
              {pos.map((f) => (
                <FactorRow key={f.id} entry={f} variant="pos" />
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>—</p>
          )}
        </div>
        <div>
          <h3 className={`${styles.colTitle} ${styles.colTitleNeg}`}>Lower exposure</h3>
          {neg.length ? (
            <ul className={styles.list}>
              {neg.map((f) => (
                <FactorRow key={f.id} entry={f} variant="neg" />
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>—</p>
          )}
        </div>
      </div>

      {industry ? (
        <div className={styles.sector}>
          <p className={styles.sectorLine}>
            Closest industry: <strong>{industry.label}</strong>
            {industry.score != null ? ` (score ${industry.score})` : ""}
            {formatFactorRankLabel(industry) ? ` · ${formatFactorRankLabel(industry)}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function FactorProfileBody({ state }: { state: ProfileState }) {
  if (state.status === "loading") {
    return (
      <div className={styles.panel}>
        <p className={styles.loading}>Loading factor profile…</p>
      </div>
    );
  }
  if (state.status === "absent") {
    return (
      <div className={styles.panel}>
        <p className={styles.lowConf}>Factor profile data is not available for this theme yet.</p>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className={styles.panel}>
        <p className={styles.lowConf}>Could not load factor profile. Try refreshing the page.</p>
      </div>
    );
  }
  if (state.status === "low_confidence") {
    return (
      <div className={styles.panel}>
        <p className={styles.lowConf}>
          Factor estimates are low confidence for this theme — rankings may be noisy until more return
          history builds.
        </p>
      </div>
    );
  }
  return <FactorProfileCard profile={state.profile} />;
}

/**
 * Factor profile card (build-time embed + optional dev client refresh).
 */
export function ThemeFactorProfile({
  slug,
  dataBaseUrl,
  initialProfile = null,
  fillRail = false,
  signInNext,
}: Props) {
  const { configured, loading: authLoading, user } = useSupabaseAuth();
  const [state, setState] = useState<ProfileState>({ status: "loading" });

  useEffect(() => {
    if (!configured || !user) return;

    let cancelled = false;

    const applyProfile = (profile: ThemeFactorProfileV0) => {
      if (cancelled) return;
      setState(resolveProfileState(profile));
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
  }, [slug, dataBaseUrl, configured, user, initialProfile]);

  const wrapClass = fillRail ? `${styles.heroWrap} ${styles.heroFillRail}` : styles.heroWrap;

  if (!configured) {
    return null;
  }

  if (authLoading) {
    return null;
  }

  if (!user) {
    return (
      <div className={wrapClass}>
        <div className={styles.block}>
          <FactorSignInPrompt signInNext={signInNext} />
        </div>
      </div>
    );
  }

  const wrapClassAuthed = fillRail ? `${styles.heroWrap} ${styles.heroFillRail}` : styles.heroWrap;

  return (
    <div className={wrapClassAuthed} aria-labelledby="factor-profile-heading">
      <div className={styles.heroHead}>
        <h2 id="factor-profile-heading" className={styles.heroTitle}>
          Factor Profile
        </h2>
        <Link href="/factors" className={styles.heroLink}>
          Browse all factor rankings
        </Link>
      </div>
      <FactorProfileBody state={state} />
    </div>
  );
}
