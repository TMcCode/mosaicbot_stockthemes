"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
 * Viewport is unknown until mount — keep SSR + first client paint identical
 * (desktop row) to avoid hydration mismatches, then upgrade to mobile scroller.
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
  fading,
  onPrefetch,
}: {
  path: HomeExplorePathV0;
  fading?: boolean;
  onPrefetch: (href: string) => void;
}) {
  return (
    <Link
      href={path.href}
      prefetch={false}
      className={`${styles.chip}${fading ? ` ${styles.chipExit}` : ""}`}
      onMouseEnter={() => onPrefetch(path.href)}
      onClick={() => {
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
  // Until viewport is known, mirror desktop markup for hydration safety.
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
  const visible = isMobile ? MOBILE_VISIBLE : desktopVisible;
  const chunks = useMemo(() => chunkPaths(cleaned, visible), [cleaned, visible]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fading, setFading] = useState(false);
  const impressedRef = useRef<Set<string>>(new Set());
  const prefetchedRef = useRef<Set<string>>(new Set());
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollPauseTimer = useRef<number | null>(null);
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

  // Desktop (and pre-mount): fade-rotate through chunk sets.
  useEffect(() => {
    if (isMobile || paused || chunks.length <= 1 || typeof window === "undefined") return;
    let fadeTimer: number | null = null;
    const t = window.setInterval(() => {
      setFading(true);
      fadeTimer = window.setTimeout(() => {
        setIndex((i) => (i + 1) % chunks.length);
        setFading(false);
      }, 180);
    }, rotateMs);
    return () => {
      window.clearInterval(t);
      if (fadeTimer != null) window.clearTimeout(fadeTimer);
    };
  }, [isMobile, paused, chunks.length, rotateMs]);

  // Mobile: auto-advance via native scroll (swipe uses the same scroller).
  useEffect(() => {
    if (!isMobile || paused || chunks.length <= 1 || typeof window === "undefined") return;
    const t = window.setInterval(() => {
      const el = scrollerRef.current;
      if (!el || !el.clientWidth) return;
      const page = Math.round(el.scrollLeft / el.clientWidth);
      const next = (page + 1) % chunks.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, rotateMs);
    return () => window.clearInterval(t);
  }, [isMobile, paused, chunks.length, rotateMs]);

  const onMobileScroll = () => {
    const el = scrollerRef.current;
    if (!el || !el.clientWidth) return;
    const page = Math.round(el.scrollLeft / el.clientWidth);
    if (page !== index && page >= 0 && page < chunks.length) {
      setIndex(page);
    }
    setPaused(true);
    if (scrollPauseTimer.current != null) window.clearTimeout(scrollPauseTimer.current);
    scrollPauseTimer.current = window.setTimeout(() => setPaused(false), 2800);
  };

  if (!cleaned.length || !chunks.length) {
    return null;
  }

  return (
    <div className={styles.strip}>
      <span className={styles.label}>Trending themes</span>
      {isMobile ? (
        <div
          ref={scrollerRef}
          className={styles.scroller}
          aria-live="polite"
          onScroll={onMobileScroll}
          onTouchStart={() => setPaused(true)}
        >
          {chunks.map((chunk, page) => (
            <div key={`page-${page}`} className={styles.page}>
              {chunk.map((p) => (
                <ChipLink key={`${page}-${p.id}`} path={p} onPrefetch={prefetchHref} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div
          className={styles.row}
          aria-live="polite"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setPaused(false);
            }
          }}
        >
          {active.map((p) => (
            <ChipLink
              key={`${index}-${p.id}`}
              path={p}
              fading={fading}
              onPrefetch={prefetchHref}
            />
          ))}
        </div>
      )}
      {chunks.length > 1 ? (
        <div
          className={`${styles.dots}${isMobile ? ` ${styles.dotsPassive}` : ""}`}
          aria-hidden
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
                onClick={() => setIndex(i)}
                aria-label={`Show explore set ${i + 1}`}
              />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
