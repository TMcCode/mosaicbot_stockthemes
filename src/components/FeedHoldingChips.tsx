"use client";

import { useState } from "react";

import { ConstituentLogo } from "@/components/ConstituentLogo";
import { formatWeight } from "@/lib/formatWeight";
import type { ManifestHomeFeedHoldingV0 } from "@/types/manifest.v0";

import styles from "./FeedEventCard.module.css";

const INITIAL_VISIBLE = 4;

function HoldingChip({
  h,
  showAction,
}: {
  h: ManifestHomeFeedHoldingV0;
  showAction?: boolean;
}) {
  const action = String(h.action || "").trim().toLowerCase();
  const showWeight =
    h.weight != null &&
    Number.isFinite(Number(h.weight)) &&
    action !== "removed";
  return (
    <div className={styles.holdingChip}>
      <div className={styles.holdingTop}>
        <ConstituentLogo ticker={h.ticker} logoUrl={h.logo_url} priority />
        <span className={styles.holdingTicker}>{h.ticker}</span>
        {showWeight ? (
          <span className={styles.holdingWeight}>{formatWeight(Number(h.weight))}</span>
        ) : null}
        {showAction && (action === "added" || action === "removed") ? (
          <span
            className={`${action === "added" ? styles.actionAdded : styles.actionRemoved}${
              showWeight ? "" : ` ${styles.actionTrail}`
            }`}
          >
            {action}
          </span>
        ) : null}
      </div>
    </div>
  );
}

type Props = {
  holdings: ManifestHomeFeedHoldingV0[];
  showAction?: boolean;
  initialVisible?: number;
};

/** Feed membership/holdings chips — +N expands in place (never navigates away). */
export function FeedHoldingChips({
  holdings,
  showAction,
  initialVisible = INITIAL_VISIBLE,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  if (!holdings.length) return null;

  const cap = Math.max(1, initialVisible);
  const hidden = Math.max(0, holdings.length - cap);
  const shown = expanded ? holdings : holdings.slice(0, cap);

  return (
    <div className={styles.holdings}>
      {shown.map((h) => (
        <HoldingChip key={`${h.ticker}-${h.action || "x"}`} h={h} showAction={showAction} />
      ))}
      {hidden > 0 && !expanded ? (
        <button
          type="button"
          className={styles.moreLink}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          +{hidden} more
        </button>
      ) : null}
      {expanded && hidden > 0 ? (
        <button
          type="button"
          className={styles.moreLink}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(false);
          }}
        >
          Show less
        </button>
      ) : null}
    </div>
  );
}
