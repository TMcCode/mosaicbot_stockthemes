"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { ConstituentLogo } from "@/components/ConstituentLogo";
import type { HomeRadarCardV0, HomeRadarV0 } from "@/types/home_radar.v0";
import type { RadarNewsCardV0, RadarNewsDayV0, RadarNewsV0 } from "@/types/radar_news.v0";
import { collapseNewTabGroupFlippers } from "@/lib/collapseNewTabGroupFlippers";
import {
  normalizeRadarTickersPreview,
  type RadarTickerPreview,
} from "@/lib/normalizeRadarTickers";
import { rotationThemeLabelSuffix } from "@/lib/rotationThemeLabel";
import { trendingReturnCardGradientStyle } from "@/lib/trendingPerfHeat";

import styles from "./HomeNarrativeRadar.module.css";

type TabKey = "new" | "accelerating" | "fading" | "news" | "watchlist";

const TAB_LABELS: Record<TabKey, string> = {
  news: "In the News",
  new: "New Themes",
  accelerating: "Accelerating",
  fading: "Fading",
  watchlist: "Watchlist",
};

/** Native hover titles for radar tabs (keep short). */
const TAB_TITLES: Partial<Record<TabKey, string>> = {
  accelerating:
    "Themes moving up on 1M with strong motion — price momentum plus estimate revisions and forward revenue growth/acceleration.",
  fading:
    "Themes moving down on 1M with strong motion — price weakness plus estimate revisions and forward revenue growth/acceleration.",
};

/** Max logos mounted per card (matches ETL bake). */
const PREVIEW_LOGOS_VISIBLE_MAX = 6;
/** Home grid: 2 rows × 3 columns. Full `/radar` page passes `previewLimit={0}`. */
export const HOME_RADAR_PREVIEW_LIMIT = 6;
/** Full radar page cap for Accelerating / Fading (matches bake). */
const ACCEL_FADING_ALL_LIMIT = 15;
/** Progressive reveal on full `/radar` grids. */
const RADAR_PAGE_INITIAL = 15;
const RADAR_PAGE_BATCH = 15;

function fmtPct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function fmtRevPp(v: number | null | undefined, label = "Rev"): string | null {
  if (v == null || Number.isNaN(Number(v))) return null;
  const n = Number(v);
  const sign = n > 0 ? "+" : "";
  return `${label} ${sign}${n.toFixed(1)}pp`;
}

const REV_DELTA_TITLE =
  "CQ lock-quarter: change in estimated YoY revenue growth since first post-report print (theme-weighted)";
const REV_CY_TITLE =
  "CY (vendor 0y unfinished year): change in estimated YoY revenue growth (theme-weighted)";
const REV_NY_TITLE =
  "NY (vendor +1y): change in estimated YoY revenue growth (theme-weighted)";

/** Calendar date from ISO ``created_at`` → ``Added 9/14/26`` (UTC date parts). */
function fmtAddedLabel(createdAt: string | null | undefined): string | null {
  const raw = String(createdAt || "").trim();
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (m) {
    return `Added ${Number(m[2])}/${Number(m[3])}/${m[1].slice(-2)}`;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return `Added ${d.getUTCMonth() + 1}/${d.getUTCDate()}/${String(d.getUTCFullYear()).slice(-2)}`;
}

/** Calendar date from ISO → ``9/21/26`` (UTC date parts). */
function fmtArticleDate(publishedAt: string | null | undefined): string | null {
  const raw = String(publishedAt || "").trim();
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (m) {
    return `${Number(m[2])}/${Number(m[3])}/${m[1].slice(-2)}`;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${String(d.getUTCFullYear()).slice(-2)}`;
}

function metricSecondaryLabel(card: HomeRadarCardV0): string | null {
  const added = fmtAddedLabel(card.created_at);
  if (added) return added;
  const label = String(card.signal_label || "").trim();
  if (!label) return null;
  // Accel/fading sometimes bake a duplicate ``1M +x%`` into signal_label.
  if (/^1M\s/i.test(label) || /^new this week$/i.test(label)) return null;
  return label;
}

function logoTitle(
  item: RadarTickerPreview,
  companyNames?: Record<string, string>,
): string {
  const name =
    item.companyName?.trim() || companyNames?.[item.ticker]?.trim() || "";
  return name ? `${item.ticker} · ${name}` : item.ticker;
}

function RadarLogoRow({
  items,
  moreHidden,
  companyNames,
}: {
  items: RadarTickerPreview[];
  moreHidden: number;
  companyNames?: Record<string, string>;
}) {
  const shown = items.slice(0, PREVIEW_LOGOS_VISIBLE_MAX);
  const more = Math.max(0, items.length - shown.length) + Math.max(0, moreHidden);
  if (!shown.length) return null;

  return (
    <div
      className={styles.logoRow}
      aria-label={`Holdings: ${shown.map((x) => x.ticker).join(", ")}`}
    >
      {shown.map((item) => (
        <span
          key={item.ticker}
          className={styles.logoHit}
          title={logoTitle(item, companyNames)}
        >
          <ConstituentLogo ticker={item.ticker} logoUrl={item.logoUrl} priority />
          <span className={styles.logoTicker}>{item.ticker}</span>
        </span>
      ))}
      {more > 0 ? <span className={styles.logoMore}>+{more}</span> : null}
    </div>
  );
}

function cardsForTab(
  radar: HomeRadarV0 | null,
  tab: Exclude<TabKey, "watchlist" | "news">,
  previewLimit: number,
): HomeRadarCardV0[] {
  const block = radar?.tabs?.[tab];
  if (!block) return [];
  // Prefer `all` when present so home can show 6 before the next discovery publish
  // still only ships `home: 5`.
  let pool =
    Array.isArray(block.all) && block.all.length > 0
      ? block.all
      : Array.isArray(block.home)
        ? block.home
        : [];
  // New only: ≥3 same group → one flipper (also collapses live JSON until next bake).
  if (tab === "new") pool = collapseNewTabGroupFlippers(pool);
  if ((tab === "accelerating" || tab === "fading") && previewLimit <= 0) {
    pool = pool.slice(0, ACCEL_FADING_ALL_LIMIT);
  }
  if (previewLimit > 0) return pool.slice(0, previewLimit);
  return pool;
}

function newsDayOptions(news: RadarNewsV0 | null): { as_of: string; label: string }[] {
  if (!news?.today?.as_of && !news?.as_of) return [];
  const days: { as_of: string; label: string }[] = [];
  const seen = new Set<string>();
  const push = (asOf: string | null | undefined) => {
    const key = String(asOf || "").trim().slice(0, 10);
    if (!key || seen.has(key)) return;
    seen.add(key);
    days.push({ as_of: key, label: fmtNewsDayLabel(key) });
  };
  push(news?.today?.as_of || news?.as_of);
  for (const row of news?.history || []) {
    push(row?.as_of);
  }
  return days;
}

function fmtNewsDayLabel(asOf: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(asOf);
  if (!m) return asOf;
  return `${Number(m[2])}/${Number(m[3])}/${m[1].slice(-2)}`;
}

function newsDayForAsOf(news: RadarNewsV0 | null, asOf: string | null): RadarNewsDayV0 | null {
  if (!news) return null;
  const key = String(asOf || "").trim().slice(0, 10);
  const todayKey = String(news.today?.as_of || news.as_of || "").slice(0, 10);
  if (!key || key === todayKey) return news.today || null;
  for (const row of news.history || []) {
    if (String(row?.as_of || "").slice(0, 10) === key) return row;
  }
  return news.today || null;
}

function newsCardsForTab(
  news: RadarNewsV0 | null,
  previewLimit: number,
  asOf?: string | null,
): RadarNewsCardV0[] {
  const day = newsDayForAsOf(news, asOf ?? null);
  if (!day) return [];
  const pool =
    previewLimit <= 0 && Array.isArray(day.all) && day.all.length > 0
      ? day.all
      : Array.isArray(day.home)
        ? day.home
        : Array.isArray(day.all)
          ? day.all
          : [];
  if (previewLimit > 0) return pool.slice(0, previewLimit);
  return pool;
}

function yearChipLabel(card: { year_suffix?: number | null; name?: string }): string | null {
  const y = card.year_suffix;
  if (y != null && Number.isFinite(Number(y))) {
    return `'${String(Math.trunc(Number(y))).padStart(2, "0").slice(-2)}`;
  }
  const m = /'(\d{2})\b/.exec(String(card.name || ""));
  return m ? `'${m[1]}` : null;
}

function RadarCardBody({
  card,
  companyNames,
  omitTitle = false,
}: {
  card: HomeRadarCardV0;
  companyNames?: Record<string, string>;
  omitTitle?: boolean;
}) {
  const previewItems = normalizeRadarTickersPreview(
    card.tickers_preview,
    // Keep full bake list so RadarLogoRow can compute +N from array overflow;
    // display still caps at PREVIEW_LOGOS_VISIBLE_MAX.
    64,
  );
  const moreHidden = Number.isFinite(card.tickers_preview_more)
    ? Math.max(0, Number(card.tickers_preview_more))
    : 0;
  const title = rotationThemeLabelSuffix(card.name, card.group_name);
  const secondary = metricSecondaryLabel(card);
  return (
    <>
      {!omitTitle ? <div className={styles.cardTitle}>{title || card.name}</div> : null}
      {card.thesis ? <p className={styles.whyNow}>{card.thesis}</p> : null}
      <div className={styles.metrics}>
        <span>1M {fmtPct(card.return_1m)}</span>
        {fmtRevPp(card.rev_cy_delta_pp, "CY") ? (
          <span title={REV_CY_TITLE}>{fmtRevPp(card.rev_cy_delta_pp, "CY")}</span>
        ) : null}
        {fmtRevPp(card.rev_ny_delta_pp, "NY") ? (
          <span title={REV_NY_TITLE}>{fmtRevPp(card.rev_ny_delta_pp, "NY")}</span>
        ) : null}
        {fmtRevPp(card.rev_delta_pp, "CQ") ? (
          <span title={REV_DELTA_TITLE}>{fmtRevPp(card.rev_delta_pp, "CQ")}</span>
        ) : null}
        {secondary ? <span>{secondary}</span> : null}
      </div>
      {previewItems.length > 0 ? (
        <RadarLogoRow
          items={previewItems}
          moreHidden={moreHidden}
          companyNames={companyNames}
        />
      ) : null}
    </>
  );
}

function RadarCardStatic({
  card,
  companyNames,
}: {
  card: HomeRadarCardV0;
  companyNames?: Record<string, string>;
}) {
  const group = String(card.group_name || "").trim();
  const yearChip = yearChipLabel(card);
  const href = card.slug ? `/themes/${card.slug}` : "/themes";
  const title = rotationThemeLabelSuffix(card.name, card.group_name);
  const heat =
    card.return_1m != null && Number.isFinite(Number(card.return_1m))
      ? trendingReturnCardGradientStyle(Number(card.return_1m))
      : undefined;
  const meta =
    group || yearChip ? (
      <div className={styles.cardMeta}>
        {group ? <span className={styles.cardGroup}>{group}</span> : null}
        {yearChip ? <span className={styles.yearChip}>{yearChip}</span> : null}
      </div>
    ) : null;

  return (
    <Link href={href} className={styles.card} style={heat}>
      <div className={styles.cardTitle}>{title || card.name}</div>
      {meta}
      <RadarCardBody card={card} companyNames={companyNames} omitTitle />
    </Link>
  );
}

function RadarCardFlipper({
  card,
  companyNames,
}: {
  card: HomeRadarCardV0;
  companyNames?: Record<string, string>;
}) {
  const siblings = card.siblings!;
  const [idx, setIdx] = useState(0);
  const safeIdx = ((idx % siblings.length) + siblings.length) % siblings.length;
  const current = siblings[safeIdx] ?? card;
  const group = String(card.group_name || current.group_name || "").trim();
  const yearChip = yearChipLabel(current);
  const href = current.slug ? `/themes/${current.slug}` : "/themes";
  const title = rotationThemeLabelSuffix(current.name, current.group_name);
  const heat =
    current.return_1m != null && Number.isFinite(Number(current.return_1m))
      ? trendingReturnCardGradientStyle(Number(current.return_1m))
      : undefined;

  const meta =
    group || yearChip ? (
      <div className={styles.cardMeta}>
        {group ? <span className={styles.cardGroup}>{group}</span> : null}
        {yearChip ? <span className={styles.yearChip}>{yearChip}</span> : null}
      </div>
    ) : null;

  return (
    <div className={styles.card} style={heat}>
      <div className={styles.cardTitleRow}>
        <Link href={href} className={styles.cardTitleLink}>
          <div className={styles.cardTitle}>{title || current.name}</div>
        </Link>
        <div className={styles.flipperNav} role="group" aria-label="Themes in this group">
          <button
            type="button"
            className={styles.flipperBtn}
            aria-label="Previous theme in group"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIdx((i) => i - 1);
            }}
          >
            ‹
          </button>
          <span className={styles.flipperCount} aria-live="polite">
            {safeIdx + 1}/{siblings.length}
          </span>
          <button
            type="button"
            className={styles.flipperBtn}
            aria-label="Next theme in group"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIdx((i) => i + 1);
            }}
          >
            ›
          </button>
        </div>
      </div>
      {meta}
      <Link href={href} className={styles.cardBodyLink}>
        <RadarCardBody card={current} companyNames={companyNames} omitTitle />
      </Link>
    </div>
  );
}

/** Flipper island only when ≥3 siblings; otherwise a static card (no useState). */
function RadarCard({
  card,
  companyNames,
}: {
  card: HomeRadarCardV0;
  companyNames?: Record<string, string>;
}) {
  if (Array.isArray(card.siblings) && card.siblings.length >= 3) {
    return <RadarCardFlipper card={card} companyNames={companyNames} />;
  }
  return <RadarCardStatic card={card} companyNames={companyNames} />;
}

function RadarProgressiveGrid({
  children,
  enabled,
}: {
  children: ReactNode[];
  enabled: boolean;
}) {
  const items = children.filter(Boolean) as ReactNode[];
  const [visible, setVisible] = useState(() =>
    enabled ? Math.min(items.length, RADAR_PAGE_INITIAL) : items.length,
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = enabled && visible < items.length;

  useEffect(() => {
    setVisible(enabled ? Math.min(items.length, RADAR_PAGE_INITIAL) : items.length);
  }, [enabled, items.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    if (typeof IntersectionObserver === "undefined") return;
    let cancelled = false;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || cancelled) return;
        setVisible((n) => Math.min(items.length, n + RADAR_PAGE_BATCH));
      },
      { root: null, rootMargin: "480px 0px", threshold: 0.01 },
    );
    obs.observe(node);
    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [hasMore, visible, items.length]);

  return (
    <>
      <div className={styles.grid}>{items.slice(0, visible)}</div>
      {hasMore ? <div ref={sentinelRef} aria-hidden style={{ height: 1 }} /> : null}
    </>
  );
}

function NewsRadarCard({
  card,
  companyNames,
}: {
  card: RadarNewsCardV0;
  companyNames?: Record<string, string>;
}) {
  const href = card.slug ? `/themes/${card.slug}` : "/themes";
  const headline = card.headlines?.[0];
  const previewItems = normalizeRadarTickersPreview(
    card.tickers_preview,
    // Keep full bake list so RadarLogoRow can compute +N from array overflow;
    // display still caps at PREVIEW_LOGOS_VISIBLE_MAX.
    64,
  );
  const moreHidden = Number.isFinite(card.tickers_preview_more)
    ? Math.max(0, Number(card.tickers_preview_more))
    : 0;
  const heat =
    card.return_1m != null && Number.isFinite(Number(card.return_1m))
      ? trendingReturnCardGradientStyle(Number(card.return_1m))
      : undefined;
  const title = rotationThemeLabelSuffix(card.name, card.group_name);
  const yearChip = yearChipLabel(card);
  const group = String(card.group_name || "").trim();
  const articleDate = fmtArticleDate(headline?.published_at);
  const sourceName = String(headline?.source_name || "").trim();
  const blurb = String(headline?.title || "").trim();

  return (
    <div className={styles.card} style={heat}>
      <Link href={href} className={styles.cardTitleLink}>
        <div className={styles.cardTitle}>{title || card.name}</div>
      </Link>
      {group || yearChip ? (
        <div className={styles.cardMeta}>
          {group ? <span className={styles.cardGroup}>{group}</span> : null}
          {yearChip ? <span className={styles.yearChip}>{yearChip}</span> : null}
        </div>
      ) : null}
      {blurb && headline?.url ? (
        <a
          href={headline.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.whyNow}
        >
          {blurb}
        </a>
      ) : blurb ? (
        <p className={styles.whyNow}>{blurb}</p>
      ) : null}
      <div className={styles.metrics}>
        <span>1M {fmtPct(card.return_1m)}</span>
        {sourceName ? (
          <span className={styles.metricSource} title={sourceName}>
            {sourceName}
          </span>
        ) : null}
        {articleDate ? <span>{articleDate}</span> : null}
      </div>
      {previewItems.length > 0 ? (
        <RadarLogoRow
          items={previewItems}
          moreHidden={moreHidden}
          companyNames={companyNames}
        />
      ) : null}
    </div>
  );
}

type Props = {
  radar: HomeRadarV0 | null;
  /** Baked In the News cards (`radar_news.json`). */
  news?: RadarNewsV0 | null;
  /** ticker → company name for hover tooltips (from search index; optional). */
  companyNames?: Record<string, string>;
  /** When false, Watchlist tab shows sign-in CTA instead of empty cards. */
  watchlistSignedIn?: boolean;
  watchlistCards?: HomeRadarCardV0[];
  /**
   * Max cards on New/Accelerating/Fading/News. Home uses 6 (2×3). Pass 0 on `/radar` for the full list.
   */
  previewLimit?: number;
  /** Initial tab (e.g. from `/radar?tab=news`). */
  initialTab?: TabKey;
  /** Initial In the News day (`YYYY-MM-DD`) from `/radar?as_of=…`. */
  initialNewsAsOf?: string;
};

export function HomeNarrativeRadar({
  radar,
  news = null,
  companyNames,
  watchlistSignedIn = false,
  watchlistCards = [],
  previewLimit = HOME_RADAR_PREVIEW_LIMIT,
  initialTab = "news",
  initialNewsAsOf,
}: Props) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  // Client fallback when server prop is missing (stale RSC / HMR) — public fixture is static.
  const [newsLocal, setNewsLocal] = useState<RadarNewsV0 | null>(null);
  const [newsFetchDone, setNewsFetchDone] = useState(Boolean(news));
  const newsEffective = news ?? newsLocal;
  const newsDays = newsDayOptions(newsEffective);
  const defaultNewsAsOf = newsDays[0]?.as_of || "";
  const [newsAsOf, setNewsAsOf] = useState(() => {
    const want = String(initialNewsAsOf || "").slice(0, 10);
    if (want && newsDays.some((d) => d.as_of === want)) return want;
    return defaultNewsAsOf;
  });

  // Static `/radar` export cannot read searchParams on the server — apply ?tab=&as_of= here.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/radar") return;
    const sp = new URLSearchParams(window.location.search);
    const rawTab = String(sp.get("tab") || "").toLowerCase();
    if (rawTab === "new" || rawTab === "accelerating" || rawTab === "fading" || rawTab === "news") {
      setTab(rawTab);
    } else if (rawTab === "watchlist") {
      setTab("news");
    }
    const asOf = String(sp.get("as_of") || "").trim().slice(0, 10);
    if (asOf) setNewsAsOf(asOf);
  }, []);

  useEffect(() => {
    if (news) {
      setNewsLocal(null);
      setNewsFetchDone(true);
      return;
    }
    let cancelled = false;
    setNewsFetchDone(false);
    (async () => {
      try {
        const res = await fetch("/fixtures/radar_news.v0.json", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as RadarNewsV0;
        if (!cancelled && data?.today) setNewsLocal(data);
      } catch {
        /* ignore — empty state stays */
      } finally {
        if (!cancelled) setNewsFetchDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [news]);

  // Keep selection valid when news bundle loads / refreshes.
  useEffect(() => {
    const days = newsDayOptions(newsEffective);
    if (days.length === 0) return;
    if (!days.some((d) => d.as_of === newsAsOf)) {
      const want = String(initialNewsAsOf || "").slice(0, 10);
      setNewsAsOf(days.some((d) => d.as_of === want) ? want : days[0].as_of);
    }
  }, [newsEffective, newsAsOf, initialNewsAsOf]);

  const radarCards: HomeRadarCardV0[] =
    tab === "watchlist"
      ? watchlistCards
      : tab === "news"
        ? []
        : cardsForTab(radar, tab, previewLimit);
  const newsList = tab === "news" ? newsCardsForTab(newsEffective, previewLimit, newsAsOf) : [];

  const onNewsDayChange = (next: string) => {
    setNewsAsOf(next);
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/radar") return;
    const u = new URL(window.location.href);
    u.searchParams.set("tab", "news");
    u.searchParams.set("as_of", next);
    window.history.replaceState({}, "", u.toString());
  };

  const viewAllHref =
    tab === "news" && newsAsOf
      ? `/radar?tab=news&as_of=${encodeURIComponent(newsAsOf)}`
      : `/radar?tab=${tab === "watchlist" ? "news" : tab}`;

  return (
    <section
      className={`${styles.section}${previewLimit <= 0 ? ` ${styles.sectionFlush}` : ""}`}
      aria-labelledby="narrative-radar-heading"
    >
      {previewLimit <= 0 ? (
        <h2 id="narrative-radar-heading" className={styles.srOnly}>
          Narrative Radar
        </h2>
      ) : (
        <div className={styles.head}>
          <h2 id="narrative-radar-heading" className={styles.title}>
            Narrative Radar
          </h2>
          <Link href={viewAllHref} className={styles.viewAll}>
            View all →
          </Link>
        </div>
      )}
      <div className={styles.tabs} role="tablist" aria-label="Radar tabs">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            title={TAB_TITLES[key]}
            className={tab === key ? styles.tabActive : styles.tab}
            onClick={() => setTab(key)}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>
      {tab === "news" && previewLimit <= 0 && newsDays.length > 0 ? (
        <div className={styles.newsDayBar}>
          <label className={styles.newsDayLabel} htmlFor="radar-news-day">
            News day
          </label>
          {newsDays.length === 1 ? (
            <span className={styles.newsDayStatic}>{newsDays[0].label}</span>
          ) : (
            <select
              id="radar-news-day"
              className={styles.newsDaySelect}
              value={newsAsOf || newsDays[0].as_of}
              onChange={(e) => onNewsDayChange(e.target.value)}
            >
              {newsDays.map((d) => (
                <option key={d.as_of} value={d.as_of}>
                  {d.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : null}
      {tab === "watchlist" && !watchlistSignedIn ? (
        <div className={styles.watchlistCta}>
          <p>Sign in to track narratives on your watchlist.</p>
          <Link href="/sign-in?next=/" className={styles.signInLink}>
            Sign in free
          </Link>
          <p className={styles.watchlistHint}>Or browse Editor&apos;s picks in Themes in Motion below.</p>
        </div>
      ) : tab === "watchlist" && watchlistSignedIn && radarCards.length === 0 ? (
        <div className={styles.watchlistCta}>
          <p>Your watchlist is empty. Add themes from any theme page.</p>
          <Link href="/my" className={styles.signInLink}>
            Open My watchlist
          </Link>
        </div>
      ) : tab === "news" && !newsFetchDone ? (
        <p className={styles.empty}>Loading news…</p>
      ) : tab === "news" && newsList.length === 0 ? (
        <p className={styles.empty}>No themes in the news yet — check back after the next publish.</p>
      ) : tab === "news" ? (
        <RadarProgressiveGrid enabled={previewLimit <= 0}>
          {newsList.map((c) => (
            <NewsRadarCard
              key={`${newsAsOf}-${c.slug}-${c.name}`}
              card={c}
              companyNames={companyNames}
            />
          ))}
        </RadarProgressiveGrid>
      ) : radarCards.length === 0 ? (
        <p className={styles.empty}>No themes in this tab yet — check back after the next publish.</p>
      ) : (
        <RadarProgressiveGrid enabled={previewLimit <= 0}>
          {radarCards.map((c) => (
            <RadarCard
              key={
                c.siblings && c.siblings.length >= 3
                  ? `flip:${String(c.group_name || c.slug)}`
                  : `${c.slug}-${c.name}`
              }
              card={c}
              companyNames={companyNames}
            />
          ))}
        </RadarProgressiveGrid>
      )}
    </section>
  );
}
