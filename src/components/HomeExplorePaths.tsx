"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { fetchChartSidecar, parseOverlayItemKey } from "@/lib/chartSidecar";
import { capturePostHog } from "@/lib/posthogClient";
import { isShortThemeName } from "@/lib/shortThemeChart";
import type { HomeExplorePathV0 } from "@/types/home_explore_paths.v0";

import styles from "./HomeExplorePaths.module.css";

const DEFAULT_VISIBLE = 3;
/** A couple chips on phone — enough to scan without burying search. */
const MOBILE_VISIBLE = 2;
const MOBILE_MAX_WIDTH = 600;
const DEFAULT_ROTATE_MS = 10_000;
const DRAG_CLICK_SUPPRESS_MS = 280;

type Props = {
  paths: HomeExplorePathV0[];
  rotateSeconds?: number;
  visibleCount?: number;
};

/** Short books strip "Short" in chip labels — hide them so PnL isn't confusing. */
function pathTargetsShortTheme(path: HomeExplorePathV0): boolean {
  const href = String(path.href || "");
  if (!href.startsWith("/themes/")) return false;
  const slug = href.split("/").pop()?.trim() || "";
  if (slug && isShortThemeName(slug.replace(/-/g, " "))) return true;
  for (const ent of path.entities || []) {
    if (ent?.kind !== "theme") continue;
    const entSlug = String(ent.slug || "").trim();
    if (entSlug && isShortThemeName(entSlug.replace(/-/g, " "))) return true;
  }
  return false;
}

function chunkPaths(paths: HomeExplorePathV0[], size: number): HomeExplorePathV0[][] {
  if (!paths.length || size < 1) return [];
  const chunks: HomeExplorePathV0[][] = [];
  for (let i = 0; i < paths.length; i += size) {
    const slice = paths.slice(i, i + size);
    if (slice.length) chunks.push(slice);
  }
  return chunks;
}

/**
 * Viewport unknown until mount — SSR + first paint use desktop page size (3) so
 * markup matches, then phones drop to 2.
 */
function useNarrowExploreViewport(): boolean | null {
  const [narrow, setNarrow] = useState<boolean | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      setNarrow(false);
      return;
    }
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const sync = () => setNarrow(mq.matches);
    sync();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);
  return narrow;
}

function prefetchTarget(href: string): string {
  return String(href || "").split("#")[0].trim();
}

function prefetchOverlaySidecars(href: string, warmed: Set<string>) {
  const path = prefetchTarget(href);
  if (!path.startsWith("/overlay")) return;
  let items = "";
  try {
    items = new URL(path, "https://stockthemes.local").searchParams.get("items") || "";
  } catch {
    return;
  }
  for (const raw of items.split(",")) {
    const parsed = parseOverlayItemKey(raw.trim());
    if (!parsed) continue;
    if (parsed.kind === "theme") continue;
    const key = `${parsed.kind}:${parsed.slug}`;
    if (warmed.has(key)) continue;
    warmed.add(key);
    void fetchChartSidecar(parsed.kind, parsed.slug, undefined, { live: true });
  }
}

function ChipLink({
  path,
  onPrefetch,
  suppressClickUntil,
}: {
  path: HomeExplorePathV0;
  onPrefetch: (href: string) => void;
  suppressClickUntil: React.MutableRefObject<number>;
}) {
  return (
    <Link
      href={path.href}
      prefetch={false}
      className={styles.chip}
      onMouseEnter={() => onPrefetch(path.href)}
      onClick={(e) => {
        if (Date.now() < suppressClickUntil.current) {
          e.preventDefault();
          return;
        }
        capturePostHog("home_path_chip_clicked", {
          path_id: path.id,
          path_kind: path.kind,
          href: path.href,
          label: path.label,
          source: path.source ?? null,
        });
      }}
    >
      {path.label}
    </Link>
  );
}

export function HomeExplorePaths({
  paths,
  rotateSeconds = 10,
  visibleCount = DEFAULT_VISIBLE,
}: Props) {
  const router = useRouter();
  const narrow = useNarrowExploreViewport();
  const isMobile = narrow === true;
  const cleaned = useMemo(
    () =>
      paths.filter(
        (p) =>
          p &&
          typeof p.label === "string" &&
          p.label.trim() &&
          typeof p.href === "string" &&
          p.href.startsWith("/") &&
          !pathTargetsShortTheme(p),
      ),
    [paths],
  );

  const desktopVisible = Math.max(1, visibleCount || DEFAULT_VISIBLE);
  // Until mount: desktop page size so SSR === first client paint.
  const visible = isMobile ? MOBILE_VISIBLE : desktopVisible;
  const chunks = useMemo(() => chunkPaths(cleaned, visible), [cleaned, visible]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const impressedRef = useRef<Set<string>>(new Set());
  const prefetchedRef = useRef<Set<string>>(new Set());
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollPauseTimer = useRef<number | null>(null);
  const suppressClickUntil = useRef(0);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    moved: boolean;
  } | null>(null);
  const rotateMs = Math.max(5, Math.min(rotateSeconds || 8, 12)) * 1000 || DEFAULT_ROTATE_MS;

  useEffect(() => {
    setIndex(0);
    const el = scrollerRef.current;
    if (el) el.scrollLeft = 0;
  }, [chunks.length, visible]);

  const active = chunks[index] ?? chunks[0] ?? [];

  const prefetchHref = (href: string) => {
    const target = prefetchTarget(href);
    if (!target || prefetchedRef.current.has(target)) return;
    prefetchedRef.current.add(target);
    void router.prefetch(target);
    prefetchOverlaySidecars(target, prefetchedRef.current);
  };

  const scrollToPage = (page: number, behavior: ScrollBehavior = "smooth") => {
    const el = scrollerRef.current;
    const n = chunks.length;
    if (!el || !el.clientWidth || n <= 0) return;
    const next = ((page % n) + n) % n;
    // Wrapping last→first (or first→last) via smooth scroll races through every
    // page; jump so the carousel feels cyclic instead of hitting a wall.
    const wrapping =
      n > 1 &&
      ((index === n - 1 && next === 0) || (index === 0 && next === n - 1));
    el.scrollTo({
      left: next * el.clientWidth,
      behavior: wrapping ? "auto" : behavior,
    });
    setIndex(next);
  };

  useEffect(() => {
    if (!active.length) return;
    for (const p of active) {
      if (impressedRef.current.has(p.id)) continue;
      impressedRef.current.add(p.id);
      capturePostHog("home_path_chip_impression", {
        path_id: p.id,
        path_kind: p.kind,
        href: p.href,
        label: p.label,
        source: p.source ?? null,
      });
    }
  }, [active]);

  useEffect(() => {
    if (typeof window === "undefined" || !chunks.length) return;
    const next = chunks[(index + 1) % chunks.length] ?? [];
    for (const p of [...active, ...next]) {
      const target = prefetchTarget(p.href);
      if (!target || prefetchedRef.current.has(target)) continue;
      prefetchedRef.current.add(target);
      void router.prefetch(target);
      prefetchOverlaySidecars(target, prefetchedRef.current);
    }
  }, [active, chunks, index, router]);

  // Auto-advance; wraps with an instant jump so it doesn't scrub backward.
  useEffect(() => {
    if (paused || dragging || chunks.length <= 1 || typeof window === "undefined") return;
    const t = window.setInterval(() => {
      scrollToPage(index + 1, "smooth");
    }, rotateMs);
    return () => window.clearInterval(t);
    // scrollToPage closes over index/chunks; re-arm each tick source change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: pause/drag/rotate only
  }, [paused, dragging, chunks.length, rotateMs, index]);

  const pauseAutoRotateBriefly = () => {
    setPaused(true);
    if (scrollPauseTimer.current != null) window.clearTimeout(scrollPauseTimer.current);
    scrollPauseTimer.current = window.setTimeout(() => setPaused(false), 2800);
  };

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || !el.clientWidth) return;
    const page = Math.round(el.scrollLeft / el.clientWidth);
    if (page !== index && page >= 0 && page < chunks.length) {
      setIndex(page);
    }
    pauseAutoRotateBriefly();
  };

  // Trackpad / mouse wheel: wrap at the ends (native overflow can't).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || chunks.length <= 1) return;
    let guardUntil = 0;
    const onWheel = (e: WheelEvent) => {
      const dx = e.deltaX !== 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (Math.abs(dx) < 8) return;
      const now = Date.now();
      if (now < guardUntil) {
        e.preventDefault();
        return;
      }
      const atStart = el.scrollLeft <= 2;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
      if (dx > 0 && atEnd) {
        e.preventDefault();
        guardUntil = now + 420;
        scrollToPage(index + 1, "smooth");
        pauseAutoRotateBriefly();
      } else if (dx < 0 && atStart) {
        e.preventDefault();
        guardUntil = now + 420;
        scrollToPage(index - 1, "smooth");
        pauseAutoRotateBriefly();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bind to scroller + page count
  }, [chunks.length, index]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el || chunks.length <= 1) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    setDragging(true);
    setPaused(true);
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || !el || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 6) drag.moved = true;
    // Allow rubber-band past ends so wrap intent is readable; snap/wrap on release.
    el.scrollLeft = drag.startScroll - dx;
  };

  const endPointerDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    try {
      el?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (drag.moved) {
      suppressClickUntil.current = Date.now() + DRAG_CLICK_SUPPRESS_MS;
      const dx = e.clientX - drag.startX;
      const direction = dx < 0 ? "next" : "prev";
      capturePostHog("home_path_chip_swiped", {
        direction,
        path_set: index,
      });
      // Direction-based page step so last→first / first→last cycle (scroll can't).
      if (el && el.clientWidth) {
        const threshold = Math.min(56, el.clientWidth * 0.18);
        if (Math.abs(dx) >= threshold) {
          scrollToPage(direction === "next" ? index + 1 : index - 1, "smooth");
        } else {
          scrollToPage(index, "smooth");
        }
      }
    }
    pauseAutoRotateBriefly();
  };

  if (!cleaned.length || !chunks.length) {
    return null;
  }

  return (
    <div className={styles.strip}>
      <span className={styles.label}>Trending themes</span>
      <div
        ref={scrollerRef}
        className={`${styles.scroller}${dragging ? ` ${styles.scrollerDragging}` : ""}`}
        aria-live="polite"
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => {
          if (!dragging) setPaused(false);
        }}
      >
        {chunks.map((chunk, page) => (
          <div key={`page-${page}`} className={styles.page}>
            {chunk.map((p) => (
              <ChipLink
                key={`${page}-${p.id}`}
                path={p}
                onPrefetch={prefetchHref}
                suppressClickUntil={suppressClickUntil}
              />
            ))}
          </div>
        ))}
      </div>
      {chunks.length > 1 ? (
        <div
          className={`${styles.dots}${isMobile ? ` ${styles.dotsPassive}` : ""}`}
          aria-hidden={isMobile || undefined}
        >
          {chunks.map((_, i) =>
            isMobile ? (
              <span
                key={i}
                className={`${styles.dot}${i === index ? ` ${styles.dotActive}` : ""}`}
              />
            ) : (
              <button
                key={i}
                type="button"
                className={`${styles.dot}${i === index ? ` ${styles.dotActive}` : ""}`}
                onClick={() => {
                  scrollToPage(i);
                  pauseAutoRotateBriefly();
                }}
                aria-label={`Show explore set ${i + 1}`}
              />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
