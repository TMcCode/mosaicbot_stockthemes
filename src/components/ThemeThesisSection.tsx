"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { buildFactorProfileBlurb } from "@/lib/factorProfileBlurb";
import { shouldShowThemeThesisUi } from "@/lib/themeThesis";
import { useThemeFactorProfileState } from "@/lib/useThemeFactorProfileState";
import type { ThemeFactorProfileV0 } from "@/types/theme.factor_profile.v0";
import type { ThemeThesisV0 } from "@/types/theme.detail.v0";

import styles from "./ThemeThesisSection.module.css";

type MobileTab = "thesis" | "bull" | "bear" | "factors";

/** Matches CSS `@media (max-width: 1100px)` — mobile thesis deck only. */
const MOBILE_THESIS_DECK_MQ = "(max-width: 1100px)";

function useMobileThesisDeck(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_THESIS_DECK_MQ).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_THESIS_DECK_MQ);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return mobile;
}

function formatThesisUpdateDate(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return "—";
  }
  const ms = Date.parse(t);
  if (!Number.isNaN(ms)) {
    return new Date(ms).toISOString().slice(0, 10);
  }
  if (t.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(t)) {
    return t.slice(0, 10);
  }
  return t;
}

type FactorDeckProps = {
  slug: string;
  dataBaseUrl: string;
  initialProfile?: ThemeFactorProfileV0 | null;
};

type Props = {
  themeThesis?: ThemeThesisV0;
  /** Span the theme hero width (below title + treemap) instead of the left rail. */
  fullBleed?: boolean;
  /** Mobile deck only: Factor Profile tab (blurb + makeup link). */
  factorDeck?: FactorDeckProps | null;
};

function cleanCasePoints(raw: string[] | undefined): string[] {
  if (!raw?.length) return [];
  return raw.map((s) => String(s ?? "").trim()).filter(Boolean);
}

function ThesisUpdateBadge({ themeThesis }: { themeThesis: ThemeThesisV0 }) {
  const upd = themeThesis.thesis_update?.trim();
  if (!upd) {
    return null;
  }
  return (
    <div className={styles.updateBadge}>
      <span className={styles.badge}>Thesis update: {formatThesisUpdateDate(upd)}</span>
    </div>
  );
}

function CasePanel({
  variant,
  title,
  points,
  mobilePane,
  deckTabs,
}: {
  variant: "bull" | "bear";
  title: string;
  points: string[];
  mobilePane?: "active" | "idle";
  deckTabs?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(Math.max(0, index), points.length - 1);
  const canToggle = points.length > 1;

  const go = (dir: -1 | 1) => {
    setIndex((i) => {
      const next = i + dir;
      if (next < 0) return points.length - 1;
      if (next >= points.length) return 0;
      return next;
    });
  };

  // Stack every slide in one grid cell so height = tallest point (no measure JS; no pager jump).
  const detail = (
    <div className={styles.casePointStack}>
      {points.map((p, i) => (
        <div
          key={i}
          className={styles.casePoint}
          data-active={i === safeIndex ? "true" : undefined}
          aria-hidden={i === safeIndex ? undefined : true}
        >
          {p}
        </div>
      ))}
    </div>
  );

  return (
    <section
      className={`${styles.casePanel} ${variant === "bull" ? styles.caseBull : styles.caseBear}`}
      data-mobile-pane={mobilePane}
      aria-label={title}
      role={mobilePane ? "tabpanel" : undefined}
    >
      {deckTabs ? <div className={styles.mobileDeckTitle}>{deckTabs}</div> : null}
      <h3 className={styles.caseTitle}>{title}</h3>
      {canToggle ? (
        <div className={styles.detailBracket} role="group" aria-label={`${title} details`}>
          <button
            type="button"
            className={styles.detailPagerBtn}
            aria-label={`Previous ${title.toLowerCase()} detail`}
            onClick={() => go(-1)}
          >
            ‹
          </button>
          {detail}
          <button
            type="button"
            className={styles.detailPagerBtn}
            aria-label={`Next ${title.toLowerCase()} detail`}
            onClick={() => go(1)}
          >
            ›
          </button>
        </div>
      ) : (
        detail
      )}
      {canToggle ? (
        <span className={styles.caseCount} aria-live="polite">
          {safeIndex + 1}/{points.length}
        </span>
      ) : null}
    </section>
  );
}

function FactorDeckPanel({
  slug,
  dataBaseUrl,
  initialProfile,
  mobilePane,
  deckTabs,
}: FactorDeckProps & {
  mobilePane?: "active" | "idle";
  deckTabs?: ReactNode;
}) {
  const state = useThemeFactorProfileState({
    slug,
    dataBaseUrl,
    initialProfile,
    enabled: true,
  });

  let body: ReactNode = null;
  if (state.status === "loading") {
    body = <p className={styles.factorDeckNote}>Loading factor profile…</p>;
  } else if (state.status === "absent" || state.status === "error") {
    body = <p className={styles.factorDeckNote}>Factor profile data is not available for this theme yet.</p>;
  } else if (state.status === "low_confidence") {
    body = (
      <p className={styles.factorDeckNote}>
        Factor estimates are low confidence for this theme — rankings may be noisy until more return
        history builds.
      </p>
    );
  } else {
    const blurb = buildFactorProfileBlurb(state.profile);
    body = (
      <>
        {blurb ? <div className={styles.factorDeckBlurb}>{blurb.text}</div> : null}
        <Link
          href={`/factors?tab=makeup&themes=${encodeURIComponent(slug)}`}
          className={styles.factorDeckLink}
        >
          Compare factor makeup
        </Link>
      </>
    );
  }

  return (
    <section
      className={styles.factorDeckPanel}
      data-mobile-pane={mobilePane}
      aria-label="Factor Profile"
      role={mobilePane ? "tabpanel" : undefined}
    >
      {deckTabs ? <div className={styles.mobileDeckTitle}>{deckTabs}</div> : null}
      {body}
    </section>
  );
}

/**
 * Theme thesis + bull/bear cases. Guests see nothing here — unlock copy lives in the hero hint.
 */
export function ThemeThesisBlock({ themeThesis, fullBleed = false, factorDeck = null }: Props) {
  if (!shouldShowThemeThesisUi(themeThesis)) {
    return null;
  }

  const thesis = themeThesis!;
  const thesisText = thesis.thesis?.trim() ?? "";
  const bull = cleanCasePoints(thesis.bull_case);
  const bear = cleanCasePoints(thesis.bear_case);
  const { configured, showAuthedUi } = useSupabaseAuth();
  const wrapClass = fullBleed ? `${styles.block} ${styles.blockFull}` : styles.block;

  if (!configured) {
    return (
      <ThesisLayout
        wrapClass={wrapClass}
        thesis={thesis}
        thesisText={thesisText}
        bull={bull}
        bear={bear}
        factorDeck={null}
      />
    );
  }

  if (!showAuthedUi) {
    return null;
  }

  return (
    <ThesisLayout
      wrapClass={wrapClass}
      thesis={thesis}
      thesisText={thesisText}
      bull={bull}
      bear={bear}
      factorDeck={factorDeck}
    />
  );
}

function ThesisLayout({
  wrapClass,
  thesis,
  thesisText,
  bull,
  bear,
  factorDeck,
}: {
  wrapClass: string;
  thesis: ThemeThesisV0;
  thesisText: string;
  bull: string[];
  bear: string[];
  factorDeck: FactorDeckProps | null;
}) {
  const showBull = bull.length > 0;
  const showBear = bear.length > 0;
  const isMobileDeck = useMobileThesisDeck();
  const [mobileTab, setMobileTab] = useState<MobileTab>("thesis");

  const showFactorTab = Boolean(isMobileDeck && factorDeck);

  const tabs: { id: MobileTab; label: string; tone?: "bull" | "bear" | "factors" }[] = [
    { id: "thesis", label: "Thesis" },
    ...(showBull ? [{ id: "bull" as const, label: "Bull", tone: "bull" as const }] : []),
    ...(showBear ? [{ id: "bear" as const, label: "Bear", tone: "bear" as const }] : []),
    ...(showFactorTab
      ? [{ id: "factors" as const, label: "Factor Profile", tone: "factors" as const }]
      : []),
  ];
  const canSwitchMobile = isMobileDeck && tabs.length > 1;
  const activeTab = tabs.some((t) => t.id === mobileTab) ? mobileTab : "thesis";

  const rowClass = [
    styles.row,
    showBull && showBear ? styles.rowThree : null,
    (showBull && !showBear) || (!showBull && showBear) ? styles.rowTwo : null,
    !showBull && !showBear ? styles.rowOne : null,
    canSwitchMobile ? styles.rowMobileDeck : null,
  ]
    .filter(Boolean)
    .join(" ");

  const mobileTabList = canSwitchMobile ? (
    <div className={styles.mobileTabs} role="tablist" aria-label="Thesis, bull, bear, and factor profile">
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`${styles.mobileTab}${selected ? ` ${styles.mobileTabActive}` : ""}${
              tab.tone === "bull" ? ` ${styles.mobileTabBull}` : ""
            }${tab.tone === "bear" ? ` ${styles.mobileTabBear}` : ""}${
              tab.tone === "factors" ? ` ${styles.mobileTabFactors}` : ""
            }`}
            onClick={() => setMobileTab(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className={wrapClass} aria-labelledby="theme-thesis-heading">
      <div className={rowClass}>
        <section
          className={styles.thesisPanel}
          data-mobile-pane={canSwitchMobile ? (activeTab === "thesis" ? "active" : "idle") : undefined}
          role={canSwitchMobile ? "tabpanel" : undefined}
        >
          {mobileTabList ? <div className={styles.mobileDeckTitle}>{mobileTabList}</div> : null}
          <div className={styles.head}>
            <h2 id="theme-thesis-heading" className={styles.title}>
              Thesis
            </h2>
          </div>
          {thesisText ? <div className={styles.thesis}>{thesisText}</div> : null}
          <ThesisUpdateBadge themeThesis={thesis} />
        </section>
        {showBull ? (
          <CasePanel
            variant="bull"
            title="Bull"
            points={bull}
            mobilePane={canSwitchMobile ? (activeTab === "bull" ? "active" : "idle") : undefined}
            deckTabs={mobileTabList}
          />
        ) : null}
        {showBear ? (
          <CasePanel
            variant="bear"
            title="Bear"
            points={bear}
            mobilePane={canSwitchMobile ? (activeTab === "bear" ? "active" : "idle") : undefined}
            deckTabs={mobileTabList}
          />
        ) : null}
        {showFactorTab && factorDeck ? (
          <FactorDeckPanel
            slug={factorDeck.slug}
            dataBaseUrl={factorDeck.dataBaseUrl}
            initialProfile={factorDeck.initialProfile}
            mobilePane={activeTab === "factors" ? "active" : "idle"}
            deckTabs={mobileTabList}
          />
        ) : null}
      </div>
    </div>
  );
}
