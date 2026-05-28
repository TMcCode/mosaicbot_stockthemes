"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  enrichFactorProfileRanks,
  factorLeaderboardsUrl,
  factorProfileHasContent,
  factorProfileUiAllowed,
  formatFactorRankLabel,
  parseThemeFactorProfile,
  themeFactorProfileUrl,
} from "@/lib/themeFactorProfile";
import { factorTooltipSummaryForId } from "@/lib/factorTooltipSummaries";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesLiveHydrationDisabled } from "@/lib/stockthemesClientConfig";
import type { FactorLeaderboardsV0 } from "@/types/factor_leaderboards.v0";
import type { ThemeFactorProfileV0, ThemeFactorScoreEntryV0 } from "@/types/theme.factor_profile.v0";

import styles from "./ThemeFactorProfile.module.css";

type Props = {
  slug: string;
  dataBaseUrl: string;
  /** Stretch panel to align bottom with hero treemap rail. */
  fillRail?: boolean;
};

function parseLeaderboards(raw: string): FactorLeaderboardsV0 {
  const data = JSON.parse(raw) as FactorLeaderboardsV0;
  if (data.schema_version !== "factor_leaderboards.v0" || !data.factors) {
    throw new Error("Invalid factor_leaderboards.v0");
  }
  return data;
}

function FactorRow({ entry, variant }: { entry: ThemeFactorScoreEntryV0; variant: "pos" | "neg" }) {
  const score = Math.max(0, Math.min(100, entry.score));
  const rankLabel = formatFactorRankLabel(entry);
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
        <span className={styles.score}>{score}</span>
      </div>
      <div className={styles.barTrack} aria-hidden="true">
        <div
          className={`${styles.barFill} ${variant === "neg" ? styles.barFillNeg : ""}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </li>
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

/**
 * Factor profile card (client fetch). Default placement: theme hero under title.
 */
export function ThemeFactorProfile({ slug, dataBaseUrl, fillRail = false }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "absent" }
    | { status: "low_confidence"; profile: ThemeFactorProfileV0 }
    | { status: "ok"; profile: ThemeFactorProfileV0 }
    | { status: "error" }
  >({ status: "loading" });

  useEffect(() => {
    if (stockthemesLiveHydrationDisabled()) {
      setState({ status: "absent" });
      return;
    }

    let cancelled = false;
    const buster = stockthemesBrowserCacheBusterQuery();
    const profileUrl = `${themeFactorProfileUrl(dataBaseUrl, slug)}?${buster}`;
    const boardsUrl = `${factorLeaderboardsUrl(dataBaseUrl)}?${buster}`;

    const loadProfile = fetch(profileUrl, {
      credentials: "omit",
      cache: stockthemesBrowserFetchCache(),
    }).then((res) => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`profile HTTP ${res.status}`);
      return res.text();
    });

    const loadBoards = fetch(boardsUrl, {
      credentials: "omit",
      cache: stockthemesBrowserFetchCache(),
    })
      .then((res) => (res.ok ? res.text() : null))
      .catch(() => null);

    Promise.all([loadProfile, loadBoards])
      .then(([profileRaw, boardsRaw]) => {
        if (cancelled) return;
        if (!profileRaw) {
          setState({ status: "absent" });
          return;
        }
        try {
          let profile = parseThemeFactorProfile(profileRaw);
          let leaderboards: FactorLeaderboardsV0 | null = null;
          if (boardsRaw) {
            try {
              leaderboards = parseLeaderboards(boardsRaw);
            } catch {
              leaderboards = null;
            }
          }
          profile = enrichFactorProfileRanks(profile, slug, leaderboards);
          if (!factorProfileHasContent(profile)) {
            setState({ status: "absent" });
            return;
          }
          if (!factorProfileUiAllowed(profile)) {
            setState({ status: "low_confidence", profile });
            return;
          }
          setState({ status: "ok", profile });
        } catch {
          setState({ status: "error" });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [slug, dataBaseUrl]);

  if (state.status === "absent" || state.status === "error") {
    return null;
  }

  const wrapClass = fillRail ? `${styles.heroWrap} ${styles.heroFillRail}` : styles.heroWrap;

  return (
    <div className={wrapClass} aria-labelledby="factor-profile-heading">
      <div className={styles.heroHead}>
        <h2 id="factor-profile-heading" className={styles.heroTitle}>
          Factor Profile
        </h2>
        <Link href="/factors" className={styles.heroLink}>
          Browse all factor rankings
        </Link>
      </div>
      {state.status === "loading" ? (
        <div className={styles.panel}>
          <p className={styles.loading}>Loading factor profile…</p>
        </div>
      ) : state.status === "low_confidence" ? (
        <div className={styles.panel}>
          <p className={styles.lowConf}>
            Factor estimates are low confidence for this theme — rankings may be noisy until more return
            history builds.
          </p>
        </div>
      ) : (
        <FactorProfileCard profile={state.profile} />
      )}
    </div>
  );
}
