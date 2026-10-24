"use client";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import {
  formatThemeFactorDisplayRank,
  themeFactorDisplayScore,
} from "@/lib/themeFactorProfile";
import { factorDisplayLabel, factorDisplayLabelShort } from "@/lib/factorDisplayLabel";
import { buildFactorProfileBlurb } from "@/lib/factorProfileBlurb";
import { factorTooltipSummaryForId } from "@/lib/factorTooltipSummaries";
import {
  useThemeFactorProfileState,
  type ThemeFactorProfileState,
} from "@/lib/useThemeFactorProfileState";
import type { ThemeFactorProfileV0, ThemeFactorScoreEntryV0 } from "@/types/theme.factor_profile.v0";

import styles from "./ThemeFactorProfile.module.css";

type Props = {
  slug: string;
  dataBaseUrl: string;
  /** Baked at static build from CDN/build cache — used in production without client fetch. */
  initialProfile?: ThemeFactorProfileV0 | null;
  /** Stretch panel to align bottom with hero treemap rail. */
  fillRail?: boolean;
};

function FactorRow({ entry, variant }: { entry: ThemeFactorScoreEntryV0; variant: "pos" | "neg" }) {
  const displayScore = themeFactorDisplayScore(entry);
  const rankLabel = formatThemeFactorDisplayRank(entry);
  const rankNum =
    entry.score_standalone != null && Number.isFinite(entry.score_standalone)
      ? entry.rank_standalone
      : entry.rank;
  const rankTotal = entry.total;
  const rankShort =
    rankNum != null && Number.isFinite(rankNum)
      ? rankTotal != null && Number.isFinite(rankTotal)
        ? `#${rankNum} of ${rankTotal.toLocaleString()}`
        : `#${rankNum}`
      : null;
  const label = factorDisplayLabel(entry.id, entry.label);
  const shortLabel = factorDisplayLabelShort(entry.id, entry.label);
  const tooltipSummary = factorTooltipSummaryForId(entry.id);
  const titleBits = [
    label,
    displayScore != null ? `score ${displayScore}` : null,
    rankLabel,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className={styles.row}>
      <div className={styles.rowHead}>
        <div className={styles.labelBlock}>
          <span
            className={styles.label}
            tabIndex={tooltipSummary ? 0 : undefined}
            title={titleBits || undefined}
            aria-label={
              tooltipSummary
                ? `${label}, score ${displayScore}${rankLabel ? `, ${rankLabel}` : ""}. ${tooltipSummary}`
                : titleBits || undefined
            }
          >
            <span className={styles.labelFull}>{label}</span>
            <span className={styles.labelShort}>{shortLabel}</span>
            {tooltipSummary ? <span className={styles.tooltip}>{tooltipSummary}</span> : null}
          </span>
          {rankLabel ? (
            <span className={styles.rank} title={rankLabel}>
              <span className={styles.rankFull}>{rankLabel}</span>
              <span className={styles.rankShort}>({rankShort ?? rankLabel})</span>
            </span>
          ) : null}
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

function FactorProfileCard({ profile }: { profile: ThemeFactorProfileV0 }) {
  const pos = profile.factors_positive ?? [];
  const neg = profile.factors_negative ?? [];
  const industry = profile.dominant_sector;
  const industryRank = industry ? formatThemeFactorDisplayRank(industry) : null;
  const blurb = buildFactorProfileBlurb(profile);

  return (
    <div className={styles.panel}>
      {blurb ? <div className={styles.blurb}>{blurb.text}</div> : null}
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
          <div className={styles.sectorLine}>
            Closest industry: <strong>{industry.label}</strong>
            {industry.score != null ? (
              <span className={styles.sectorMeta}>{` (score ${industry.score})`}</span>
            ) : null}
            {industryRank ? (
              <span className={styles.sectorMeta}>{` · ${industryRank}`}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FactorProfileBody({ state }: { state: ThemeFactorProfileState }) {
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
}: Props) {
  const { configured, showAuthedUi } = useSupabaseAuth();
  const state = useThemeFactorProfileState({
    slug,
    dataBaseUrl,
    initialProfile,
    enabled: Boolean(configured && showAuthedUi),
  });

  if (!configured || !showAuthedUi) {
    return null;
  }

  const wrapClassAuthed = fillRail ? `${styles.heroWrap} ${styles.heroFillRail}` : styles.heroWrap;

  return (
    <div className={wrapClassAuthed} aria-labelledby="factor-profile-heading">
      <div className={styles.heroHead}>
        <h2 id="factor-profile-heading" className={styles.heroTitle}>
          Factor Profile
        </h2>
        <Link
          href={`/factors?tab=makeup&themes=${encodeURIComponent(slug)}`}
          className={styles.heroLink}
        >
          Compare factor makeup
        </Link>
      </div>
      <FactorProfileBody state={state} />
    </div>
  );
}
