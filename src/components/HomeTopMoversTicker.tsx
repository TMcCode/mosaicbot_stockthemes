"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { TopMoverTickerItem } from "@/lib/buildTopMoversTicker";
import { trendingReturnHeatStyle } from "@/lib/trendingPerfHeat";

import styles from "./HomeTopMoversTicker.module.css";

/** Wall-clock seconds for one full marquee loop (higher = slower). */
const LOOP_SECONDS = 250;
const DRAG_THRESHOLD_PX = 5;
const CLICK_SUPPRESS_MS = 400;

function fmtPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

type Props = {
  items: TopMoverTickerItem[];
  /** Pre-formatted on the server to avoid locale hydration mismatches. */
  asOfLabel?: string;
};

function normalizeLoopScroll(el: HTMLDivElement) {
  const half = el.scrollWidth / 2;
  if (half <= 0) return;
  if (el.scrollLeft >= half) {
    el.scrollLeft -= half;
  } else if (el.scrollLeft < 0) {
    el.scrollLeft += half;
  }
}

function TickerChip({
  item,
  suppressClickUntil,
}: {
  item: TopMoverTickerItem;
  suppressClickUntil: React.RefObject<number>;
}) {
  const heat = trendingReturnHeatStyle(item.pct1d);
  return (
    <Link
      href={`/themes/${encodeURIComponent(item.slug)}`}
      className={styles.chip}
      style={{ backgroundColor: heat.backgroundColor, color: heat.color }}
      draggable={false}
      onClick={(e) => {
        if (Date.now() < suppressClickUntil.current) {
          e.preventDefault();
        }
      }}
    >
      <span className={styles.chipRank}>
        {item.tier === "top" ? `#${item.rank}` : `▼${item.rank}`}
      </span>
      <span className={styles.chipName}>{item.name}</span>
      <span className={styles.chipPct}>{fmtPct(item.pct1d)}</span>
    </Link>
  );
}

/** Auto-scroll marquee with hover pause, wheel/drag scrub, and theme links. */
export function HomeTopMoversTicker({ items, asOfLabel }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const suppressClickUntil = useRef(0);
  const dragRef = useRef({ pointerId: -1, startX: 0, startScroll: 0, moved: false });

  const [hoverPaused, setHoverPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const autoPaused = hoverPaused || scrubbing || userPaused;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || reducedMotion) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      if (!el.isConnected) return;
      if (!autoPaused) {
        const half = el.scrollWidth / 2;
        if (half > 0) {
          const dt = Math.min(now - last, 48);
          el.scrollLeft += (half / (LOOP_SECONDS * 1000)) * dt;
          normalizeLoopScroll(el);
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoPaused, reducedMotion, items.length]);

  useEffect(() => {
    return () => {
      const el = viewportRef.current;
      const drag = dragRef.current;
      if (!el || drag.pointerId < 0) return;
      try {
        el.releasePointerCapture(drag.pointerId);
      } catch {
        /* capture already released */
      }
      dragRef.current = { pointerId: -1, startX: 0, startScroll: 0, moved: false };
    };
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      e.preventDefault();
      el.scrollLeft += delta;
      normalizeLoopScroll(el);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [items.length]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = viewportRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    const drag = dragRef.current;
    if (!el || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > DRAG_THRESHOLD_PX) {
      drag.moved = true;
      setScrubbing(true);
    }
    if (drag.moved) {
      el.scrollLeft = drag.startScroll - dx;
      normalizeLoopScroll(el);
    }
  }, []);

  const endPointerDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    const drag = dragRef.current;
    if (!el || drag.pointerId !== e.pointerId) return;
    if (drag.moved) {
      suppressClickUntil.current = Date.now() + CLICK_SUPPRESS_MS;
    }
    dragRef.current = { pointerId: -1, startX: 0, startScroll: 0, moved: false };
    setScrubbing(false);
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  if (items.length === 0) return null;

  const renderSequence = (keyPrefix: string) => (
    <div className={styles.sequence}>
      {items.map((item) => (
        <TickerChip
          key={`${keyPrefix}-${item.tier}-${item.rank}-${item.slug}`}
          item={item}
          suppressClickUntil={suppressClickUntil}
        />
      ))}
    </div>
  );

  const topCount = items.filter((i) => i.tier === "top").length;
  const bottomCount = items.filter((i) => i.tier === "bottom").length;

  const viewportClass = [
    styles.viewport,
    scrubbing ? styles.viewportDragging : "",
    reducedMotion ? styles.viewportReducedMotion : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={styles.wrap} aria-label="Top movers today by 1 day percent change">
      <div className={styles.header}>
        <div className={styles.headerStart}>
          <span className={styles.label}>Top movers today</span>
          {!reducedMotion ? (
            <button
              type="button"
              className={styles.pauseBtn}
              onClick={() => setUserPaused((paused) => !paused)}
              aria-pressed={userPaused}
              aria-label={userPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
              title={userPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
            >
              <span className={styles.pauseIcon} aria-hidden>
                {userPaused ? "▶" : "⏸"}
              </span>
            </button>
          ) : null}
        </div>
        <span className={styles.meta}>
          1D % · {topCount} gainers · {bottomCount} losers
          {asOfLabel ? ` · ${asOfLabel}` : ""}
        </span>
      </div>
      <div
        ref={viewportRef}
        className={viewportClass}
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        role="region"
        aria-roledescription="carousel"
        tabIndex={0}
        aria-label="Scroll horizontally to browse top movers; drag or use trackpad to scrub"
      >
        <div className={styles.track}>
          {renderSequence("a")}
          {renderSequence("b")}
        </div>
      </div>
    </section>
  );
}
