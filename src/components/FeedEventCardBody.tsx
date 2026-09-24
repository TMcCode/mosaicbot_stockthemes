import Link from "next/link";
import type { ReactNode } from "react";

import { FeedHoldingChips } from "@/components/FeedHoldingChips";
import { FeedLogoRow } from "@/components/FeedLogoRow";
import { FeedThesisThemesSummary } from "@/components/FeedThesisThemesSummary";
import {
  groupEyebrowFromThemeName,
  rotationThemeLabelSuffix,
} from "@/lib/rotationThemeLabel";
import type {
  ManifestHomeFeedEventV0,
  ManifestHomeFeedHoldingV0,
} from "@/types/manifest.v0";

import styles from "./FeedEventCard.module.css";

export function feedKindLabel(kind: ManifestHomeFeedEventV0["kind"]): string {
  switch (kind) {
    case "theme_new":
      return "New theme";
    case "theme_updated":
      return "Membership Updated";
    case "theme_weights_updated":
      return "Weights";
    case "text_table_update":
      return "Thesis Updated";
    case "theme_deleted":
      return "Deleted";
    default:
      return "Update";
  }
}

export function feedKindClass(kind: ManifestHomeFeedEventV0["kind"]): string {
  switch (kind) {
    case "theme_new":
      return styles.kindNew;
    case "theme_updated":
      return styles.kindMembership;
    case "theme_weights_updated":
      return styles.kindWeights;
    case "text_table_update":
      return styles.kindThesis;
    case "theme_deleted":
      return styles.kindDeleted;
    default:
      return styles.kindDefault;
  }
}

function cleanFeedTitle(evt: ManifestHomeFeedEventV0): string {
  const title = String(evt.title || "").trim();
  if (evt.kind === "theme_new" && title.toLowerCase().endsWith(" - new theme")) {
    return title.slice(0, -(" - new theme".length));
  }
  if (evt.kind === "theme_updated" && title.toLowerCase().endsWith(" - theme updated")) {
    return title.slice(0, -(" - theme updated".length));
  }
  if (
    evt.kind === "theme_weights_updated" &&
    title.toLowerCase().endsWith(" - theme weights updated")
  ) {
    return title.slice(0, -(" - theme weights updated".length));
  }
  if (evt.kind === "text_table_update") {
    const stripped = title
      .replace(/\s+—\s+thesis updated$/i, "")
      .replace(/\s+—\s+text tables updated$/i, "")
      .trim();
    if (stripped) return stripped;
  }
  if (evt.kind === "theme_deleted") {
    const base = String(evt.theme_name || "").trim();
    if (base) return base;
  }
  return title;
}

/** ``'24`` from ``Auto OEMs '24: …`` (same idea as Narrative Radar). */
function yearChipFromName(name: string): string | null {
  const m = /'(\d{2})\b/.exec(String(name || ""));
  return m ? `'${m[1]}` : null;
}

/** Parse ``"AAPL, MSFT added"`` / ``"ETB.BO removed"`` phrases into chips. */
export function holdingsFromChangesPreview(
  evt: ManifestHomeFeedEventV0,
  opts?: { limit?: number },
): { holdings: ManifestHomeFeedHoldingV0[]; moreCount: number } {
  const raw = Array.isArray(evt.changes_preview)
    ? evt.changes_preview.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const more = Number.isFinite(evt.changes_more_count) ? Number(evt.changes_more_count) : 0;
  const holdings: ManifestHomeFeedHoldingV0[] = [];
  for (const item of raw) {
    const m = item.match(/^(.+?)\s+(added|removed)$/i);
    if (!m) continue;
    const action = String(m[2] || "").toLowerCase();
    if (action !== "added" && action !== "removed") continue;
    const tickers = String(m[1] || "")
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    for (const ticker of tickers) {
      holdings.push({ ticker, action });
    }
  }
  const limit = opts?.limit;
  if (limit != null && limit > 0 && holdings.length > limit) {
    return {
      holdings: holdings.slice(0, limit),
      moreCount: more + Math.max(0, holdings.length - limit),
    };
  }
  return { holdings, moreCount: more };
}

function mergeMembershipHoldings(
  primary: ManifestHomeFeedHoldingV0[],
  extra: ManifestHomeFeedHoldingV0[],
): ManifestHomeFeedHoldingV0[] {
  const out = [...primary];
  const seen = new Set(
    primary.map((h) => `${String(h.ticker || "").toUpperCase()}:${String(h.action || "").toLowerCase()}`),
  );
  for (const h of extra) {
    const key = `${String(h.ticker || "").toUpperCase()}:${String(h.action || "").toLowerCase()}`;
    if (!h.ticker || seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

function weightOf(h: ManifestHomeFeedHoldingV0): number {
  const w = h.weight;
  return w != null && Number.isFinite(Number(w)) ? Number(w) : -1;
}

/** New-theme holdings: weight desc, ticker tie-break. */
function sortHoldingsByWeight(rows: ManifestHomeFeedHoldingV0[]): ManifestHomeFeedHoldingV0[] {
  return [...rows].sort((a, b) => {
    const dw = weightOf(b) - weightOf(a);
    if (dw !== 0) return dw;
    return String(a.ticker || "").localeCompare(String(b.ticker || ""));
  });
}

/** Added (weight desc) first, then removed; ticker tie-break. */
function sortMembershipPreview(
  rows: ManifestHomeFeedHoldingV0[],
): ManifestHomeFeedHoldingV0[] {
  const actionRank = (h: ManifestHomeFeedHoldingV0) => {
    const a = String(h.action || "").toLowerCase();
    if (a === "added") return 0;
    if (a === "removed") return 1;
    return 2;
  };
  return [...rows].sort((a, b) => {
    const ra = actionRank(a);
    const rb = actionRank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 0) {
      const dw = weightOf(b) - weightOf(a);
      if (dw !== 0) return dw;
    }
    return String(a.ticker || "").localeCompare(String(b.ticker || ""));
  });
}

export type FeedThemeMeta = {
  groupName?: string | null;
  groupSlug?: string | null;
  tickerCount?: number | null;
  /** Normalized spy sector from the theme's group (manifest-baked). */
  spySector?: string | null;
};

export type FeedEventCardBodyProps = {
  evt: ManifestHomeFeedEventV0;
  dateLabel: string;
  compact?: boolean;
  flipperNav?: ReactNode;
  themeMetaBySlug?: Record<string, FeedThemeMeta>;
  tickersByThemeSlug?: Record<string, { tickers: string[]; more: number }>;
  thesisBySlug?: Record<string, string>;
};

/**
 * Presentational feed card (no useState). Safe as a Server Component when
 * imported from RSC parents; logo/chip children remain client islands.
 */
export function FeedEventCardBody({
  evt,
  dateLabel,
  compact,
  flipperNav,
  themeMetaBySlug,
  tickersByThemeSlug,
  thesisBySlug,
}: FeedEventCardBodyProps) {
  const slugFromEvt = String(evt.theme_slug || "").trim();
  const slugFromThemes = String(evt.thesis_themes?.[0]?.slug || "").trim();
  const slug = slugFromEvt || slugFromThemes;
  const linkTheme = evt.kind !== "theme_deleted" && Boolean(slug);
  const noteText = String(evt.note || "").trim();
  const meta = slug && themeMetaBySlug ? themeMetaBySlug[slug] : undefined;
  const fullThemeName = cleanFeedTitle(evt);
  // Prefer catalog group; fall back to ``Group 'YY: …`` parsed from the title.
  const groupName =
    String(meta?.groupName || "").trim() ||
    groupEyebrowFromThemeName(fullThemeName) ||
    "";
  const groupSlug = String(meta?.groupSlug || "").trim();
  const tickerCount =
    meta?.tickerCount != null && Number.isFinite(Number(meta.tickerCount))
      ? Math.max(0, Math.trunc(Number(meta.tickerCount)))
      : null;
  // Group is already the eyebrow — show subtheme only; year as chip.
  const themeLabel =
    rotationThemeLabelSuffix(fullThemeName, groupName) || fullThemeName;
  const yearChip = yearChipFromName(fullThemeName);

  let holdings = Array.isArray(evt.holdings_preview) ? [...evt.holdings_preview] : [];
  let holdingsMore = Number(evt.holdings_more_count) || 0;
  let membership = Array.isArray(evt.membership_preview) ? [...evt.membership_preview] : [];

  if (evt.kind === "theme_updated" || evt.kind === "theme_new") {
    const parsed = holdingsFromChangesPreview(evt, {
      limit: compact ? 6 : undefined,
    });
    if (evt.kind === "theme_updated") {
      if (membership.length === 0 && parsed.holdings.length) {
        membership = parsed.holdings;
      } else if (!compact && parsed.holdings.length) {
        // Recover tickers truncated from membership_preview (feed in-card expand).
        membership = mergeMembershipHoldings(membership, parsed.holdings);
      }
    } else if (holdings.length === 0 && parsed.holdings.length) {
      holdings = parsed.holdings.map(({ ticker, action: _a, ...rest }) => ({ ticker, ...rest }));
      holdingsMore = compact ? parsed.moreCount : 0;
    }
  }

  if (membership.length) {
    membership = sortMembershipPreview(membership);
  }
  if (holdings.length && evt.kind === "theme_new") {
    holdings = sortHoldingsByWeight(holdings);
  }

  const showThesisThemes =
    !compact &&
    evt.kind === "text_table_update" &&
    (Boolean(evt.thesis_themes?.length) ||
      String(evt.summary || "").trim().startsWith("Themes:"));
  const isLifecycle =
    evt.kind === "theme_new" ||
    evt.kind === "theme_updated" ||
    evt.kind === "theme_weights_updated" ||
    evt.kind === "theme_deleted";

  const showGroup = Boolean(groupName);
  const showRichMeta = !compact && (groupName || tickerCount != null);
  // Home compact strip = logos only; thesis blurb is /feed (non-compact).
  const thesisCut =
    !compact && evt.kind === "text_table_update"
      ? String(evt.thesis_preview || (slug && thesisBySlug?.[slug]) || "").trim()
      : "";

  const chipTickers = (membership.length ? membership : holdings)
    .map((h) => String(h.ticker || "").trim().toUpperCase())
    .filter(Boolean);
  const fallback = slug && tickersByThemeSlug?.[slug] ? tickersByThemeSlug[slug] : null;
  const fallbackTickers = fallback?.tickers ?? [];
  const logoTickers = chipTickers.length ? chipTickers : fallbackTickers;
  const logoMore = chipTickers.length
    ? membership.length
      ? Math.max(0, Number(evt.membership_more_count) || 0)
      : holdingsMore
    : Math.max(0, fallback?.more ?? (tickerCount ?? 0) - logoTickers.length);

  const cardClass = `${styles.card} ${feedKindClass(evt.kind)} ${compact ? styles.compact : ""} ${
    linkTheme ? styles.cardInteractive : ""
  }`;

  return (
    <article className={cardClass}>
      {linkTheme ? (
        <Link
          href={`/themes/${slug}`}
          className={styles.cardStretchLink}
          aria-label={`Open ${fullThemeName}`}
        />
      ) : null}

      <div className={styles.head}>
        {showGroup ? (
          <div className={`${styles.groupEyebrow} ${styles.cardRaise}`}>
            {groupSlug ? (
              <Link href={`/groups/${groupSlug}`} className={styles.groupEyebrowLink}>
                {groupName}
              </Link>
            ) : (
              <span className={styles.groupEyebrowText}>{groupName}</span>
            )}
          </div>
        ) : (
          <span className={styles.headSpacer} aria-hidden="true" />
        )}
        <span className={styles.kindBadge}>{feedKindLabel(evt.kind)}</span>
      </div>

      <div className={styles.titleRow}>
        <div className={styles.titleLeft}>
          <span className={styles.title}>{themeLabel}</span>
          {yearChip ? <span className={styles.yearChip}>{yearChip}</span> : null}
        </div>
        {flipperNav ? (
          <div className={`${styles.titleRight} ${styles.cardRaise}`}>{flipperNav}</div>
        ) : null}
      </div>

      {showRichMeta && tickerCount != null ? (
        <div className={styles.metaRow}>
          <span className={styles.metaText}>
            {tickerCount} {tickerCount === 1 ? "stock" : "stocks"}
          </span>
        </div>
      ) : null}

      {noteText && evt.kind !== "text_table_update" ? (
        <p className={styles.note}>{noteText}</p>
      ) : null}
      {thesisCut ? <p className={styles.thesisCut}>{thesisCut}</p> : null}

      {compact ? (
        <div className={styles.logoDateRow}>
          <FeedLogoRow tickers={logoTickers} moreCount={logoMore} />
          <span className={`${styles.when} ${styles.cardRaise}`}>{dateLabel || "Recent"}</span>
        </div>
      ) : (
        <div className={styles.feedBody}>
          <div className={styles.cardRaise}>
            <FeedHoldingChips holdings={holdings} />
            <FeedHoldingChips holdings={membership} showAction />
          </div>
          <span className={styles.when}>{dateLabel || "Recent"}</span>
        </div>
      )}

      {showThesisThemes ? (
        <div className={`${styles.bodyText} ${styles.cardRaise}`}>
          <FeedThesisThemesSummary
            evt={evt}
            hideIfMatchesTitle={fullThemeName || themeLabel}
          />
        </div>
      ) : null}
      {!compact &&
      !showThesisThemes &&
      !holdings.length &&
      !membership.length &&
      evt.summary &&
      !isLifecycle ? (
        <p className={styles.bodyText}>{evt.summary}</p>
      ) : null}
    </article>
  );
}
