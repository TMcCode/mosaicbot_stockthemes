"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { HomeCloseMoversBoard } from "@/components/HomeCloseMoversBoard";
import type { CloseMoversBoardPayload } from "@/lib/buildCloseMoversBoard";
import type { TopMoverTickerItem, TopMoverTickerPeriod } from "@/lib/buildTopMoversTicker";
import { trendingColumnHeader } from "@/lib/trendingCompareMetrics";
import { trendingReturnHeatStyle } from "@/lib/trendingPerfHeat";

import styles from "./HomeTopMoversTicker.module.css";

const CLOSE_BOARD_STORAGE_KEY = "st-home-close-movers-expanded";

/** Wall-clock seconds for one full marquee loop (higher = slower). */
const LOOP_SECONDS_DESKTOP = 340;
const LOOP_SECONDS_MOBILE = 460;
const DRAG_THRESHOLD_PX = 5;
const CLICK_SUPPRESS_MS = 400;

function fmtPct(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

type Props = {
  items: TopMoverTickerItem[];
  /** 1D on weekdays (ET); 10D on Sat/Sun — set on server with `homeTopMoversTickerPeriod()`. */
  period?: TopMoverTickerPeriod;
  /** Pre-formatted on the server to avoid locale hydration mismatches. */
  asOfLabel?: string;
  /**
   * Post-close top/bottom 10 (+ news). Same “Top movers today” shell:
   * expanded = board, collapsed = marquee ticker.
   */
  closeBoard?: CloseMoversBoardPayload | null;
};

const KEY_STEP_PX = 120;

function wrapOffset(offset: number, half: number): number {
  if (half <= 0) return 0;
  const wrapped = offset % half;
  return wrapped < 0 ? wrapped + half : wrapped;
}

function TickerChip({
  item,
  suppressClickUntil,
}: {
  item: TopMoverTickerItem;
  suppressClickUntil: React.RefObject<number>;
}) {
  const heat =
    item.returnPct != null && Number.isFinite(item.returnPct)
      ? trendingReturnHeatStyle(item.returnPct)
      : undefined;
  return (
    <Link
      href={`/themes/${encodeURIComponent(item.slug)}`}
      className={styles.chip}
      style={
        heat
          ? { backgroundColor: heat.backgroundColor, color: heat.color }
          : undefined
      }
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
      <span className={styles.chipPct}>{fmtPct(item.returnPct)}</span>
    </Link>
  );
}

/** Auto-scroll marquee with hover pause, wheel/drag scrub, and theme links. */
export function HomeTopMoversTicker({
  items,
  period = "1D",
  asOfLabel,
  closeBoard = null,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const suppressClickUntil = useRef(0);
  const dragRef = useRef({ pointerId: -1, startX: 0, startOffset: 0, moved: false });
  const loopSecondsRef = useRef(LOOP_SECONDS_DESKTOP);
  /** Fractional px; transforms keep sub-pixel steps that Safari drops from `scrollLeft`. */
  const offsetRef = useRef(0);
  const halfRef = useRef(0);
  const hasCloseBoard = Boolean(closeBoard?.top.length || closeBoard?.bottom.length);
  const [boardExpanded, setBoardExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem(CLOSE_BOARD_STORAGE_KEY) !== "0";
    } catch {
      return true;
    }
  });

  const setOffset = useCallback((next: number) => {
    const track = trackRef.current;
    offsetRef.current = wrapOffset(next, halfRef.current);
    if (track) {
      track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
    }
  }, []);

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
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => {
      loopSecondsRef.current = mq.matches ? LOOP_SECONDS_MOBILE : LOOP_SECONDS_DESKTOP;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      halfRef.current = track.scrollWidth / 2;
      setOffset(offsetRef.current);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [items.length, setOffset]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || reducedMotion || autoPaused) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      if (!track.isConnected) return;
      const half = halfRef.current;
      if (half > 0) {
        const dt = Math.min(now - last, 48);
        setOffset(offsetRef.current + (half / (loopSecondsRef.current * 1000)) * dt);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoPaused, reducedMotion, items.length, setOffset]);

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
      dragRef.current = { pointerId: -1, startX: 0, startOffset: 0, moved: false };
    };
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      e.preventDefault();
      setOffset(offsetRef.current + delta);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [items.length, setOffset]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startOffset: offsetRef.current,
      moved: false,
    };
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    const drag = dragRef.current;
    if (!el || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > DRAG_THRESHOLD_PX) {
      drag.moved = true;
      setScrubbing(true);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (drag.moved) {
      setOffset(drag.startOffset - dx);
    }
  }, [setOffset]);

  const endPointerDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    const drag = dragRef.current;
    if (!el || drag.pointerId !== e.pointerId) return;
    if (drag.moved) {
      suppressClickUntil.current = Date.now() + CLICK_SUPPRESS_MS;
    }
    dragRef.current = { pointerId: -1, startX: 0, startOffset: 0, moved: false };
    setScrubbing(false);
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  const safeItems = items.filter(
    (i) => i.returnPct != null && Number.isFinite(i.returnPct),
  );
  if (safeItems.length === 0) return null;

  const renderSequence = (keyPrefix: string) => (
    <div className={styles.sequence}>
      {safeItems.map((item) => (
        <TickerChip
          key={`${keyPrefix}-${item.tier}-${item.rank}-${item.slug}`}
          item={item}
          suppressClickUntil={suppressClickUntil}
        />
      ))}
    </div>
  );

  const topCount = safeItems.filter((i) => i.tier === "top").length;
  const bottomCount = safeItems.filter((i) => i.tier === "bottom").length;

  const viewportClass = [
    styles.viewport,
    scrubbing ? styles.viewportDragging : "",
    reducedMotion ? styles.viewportReducedMotion : "",
  ]
    .filter(Boolean)
    .join(" ");

  const periodLabel = trendingColumnHeader(period);
  const showBoard = hasCloseBoard && boardExpanded && closeBoard;

  return (
    <section
      className={styles.wrap}
      aria-label={`Top movers today by ${period === "10D" ? "10 trading day" : "1 day"} percent change`}
    >
      <div className={styles.header}>
        <div className={styles.headerStart}>
          <span className={styles.label}>Top movers today</span>
          {hasCloseBoard ? (
            <button
              type="button"
              className={styles.pauseBtn}
              onClick={() => {
                setBoardExpanded((v) => {
                  const next = !v;
                  try {
                    window.localStorage.setItem(
                      CLOSE_BOARD_STORAGE_KEY,
                      next ? "1" : "0",
                    );
                  } catch {
                    /* ignore */
                  }
                  return next;
                });
              }}
              aria-expanded={boardExpanded}
              aria-controls={boardExpanded ? "home-close-movers-board" : undefined}
              title={boardExpanded ? "Hide top & bottom 10" : "Show top & bottom 10"}
            >
              <span className={styles.pauseIcon} aria-hidden>
                {boardExpanded ? "▾" : "▸"}
              </span>
            </button>
          ) : null}
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
          {showBoard
            ? `1D close · top ${closeBoard?.top.length ?? 0} · bottom ${closeBoard?.bottom.length ?? 0}`
            : `${periodLabel} · ${topCount} gainers · ${bottomCount} losers`}
          {asOfLabel ? ` · ${asOfLabel}` : ""}
          {" · "}
          <Link href="/compare" className={styles.metaLink}>
            All theme returns →
          </Link>
        </span>
      </div>
      {showBoard && closeBoard ? <HomeCloseMoversBoard board={closeBoard} /> : null}
      <div
        ref={viewportRef}
        className={viewportClass}
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            setOffset(offsetRef.current + KEY_STEP_PX);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            setOffset(offsetRef.current - KEY_STEP_PX);
          }
        }}
        role="region"
        aria-roledescription="carousel"
        tabIndex={0}
        aria-label="Scroll horizontally to browse top movers; drag or use trackpad to scrub"
      >
        <div ref={trackRef} className={styles.track}>
          {renderSequence("a")}
          {renderSequence("b")}
        </div>
      </div>
    </section>
  );
}
