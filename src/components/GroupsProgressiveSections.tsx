"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { AdPlacement } from "@/components/AdPlacement";

type GroupRow = {
  slug: string;
  name: string;
  themeCount: number | null;
  tickerCount: number | null;
  blurb: string;
};

type SectorRow = {
  sector: string;
  groups: GroupRow[];
};

type Props = {
  sectors: SectorRow[];
  initialSectors?: number;
  classNameSectorBlock: string;
  classNameSectorHeading: string;
  classNameGrid: string;
  classNameListLink: string;
  classNameName: string;
  classNameMeta: string;
  classNameGroupBlurb: string;
  classNameAdStrip: string;
  classNameAdStripBanner: string;
  classNameGroupsAdStrip: string;
};

export function GroupsProgressiveSections({
  sectors,
  initialSectors = 4,
  classNameSectorBlock,
  classNameSectorHeading,
  classNameGrid,
  classNameListLink,
  classNameName,
  classNameMeta,
  classNameGroupBlurb,
  classNameAdStrip,
  classNameAdStripBanner,
  classNameGroupsAdStrip,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(Math.min(initialSectors, sectors.length));
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerAvailable = typeof IntersectionObserver !== "undefined";
  const visible = useMemo(() => sectors.slice(0, visibleCount), [sectors, visibleCount]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visibleCount >= sectors.length) return;
    if (!observerAvailable) return;
    let cancelled = false;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!cancelled) {
          setVisibleCount((n) => Math.min(sectors.length, n + 2));
        }
      },
      { root: null, rootMargin: "450px 0px", threshold: 0.01 },
    );
    obs.observe(node);
    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [visibleCount, sectors.length, observerAvailable]);

  return (
    <>
      {visible.map((row, idx) => (
        <div key={`sector-wrap-${row.sector}`}>
          <div className={classNameSectorBlock}>
            <h3 className={classNameSectorHeading}>{row.sector}</h3>
            <ul className={classNameGrid} style={{ listStyle: "none", paddingLeft: 0 }}>
              {row.groups.map((g) => (
                <li key={g.slug}>
                  <Link href={`/groups/${g.slug}`} className={classNameListLink} prefetch={false}>
                    <span className={classNameName}>{g.name}</span>
                    <span className={classNameMeta}>
                      {g.themeCount != null ? `${g.themeCount} themes` : ""}
                      {g.themeCount != null && g.tickerCount != null ? " · " : ""}
                      {g.tickerCount != null ? `${g.tickerCount} tickers` : ""}
                    </span>
                    {g.blurb ? <span className={classNameGroupBlurb}>{g.blurb}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {(idx + 1) % 2 === 0 && idx < visible.length - 1 ? (
            <AdPlacement
              placement="groupsIndexStrip"
              className={`${classNameAdStrip} ${classNameGroupsAdStrip}`}
              classNameWhenActive={`${classNameAdStrip} ${classNameAdStripBanner} ${classNameGroupsAdStrip}`}
              placeholderLabel="Ad Slot · Groups strip"
              format="horizontal"
            />
          ) : null}
        </div>
      ))}
      {visibleCount < sectors.length ? (
        <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
      ) : null}
      {visibleCount < sectors.length && !observerAvailable ? (
        <button
          type="button"
          onClick={() => setVisibleCount((n) => Math.min(sectors.length, n + 4))}
          style={{ marginTop: 8 }}
        >
          Load more sectors
        </button>
      ) : null}
    </>
  );
}
