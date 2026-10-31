"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { fetchChartSidecar, parseOverlayItemKey } from "@/lib/chartSidecar";
import { capturePostHog } from "@/lib/posthogClient";
import type { HomeExplorePathV0 } from "@/types/home_explore_paths.v0";

import styles from "./HomeExplorePaths.module.css";

const DEFAULT_VISIBLE = 3;
const DEFAULT_ROTATE_MS = 10_000;

type Props = {
  paths: HomeExplorePathV0[];
  rotateSeconds?: number;
  visibleCount?: number;
};

function chunkPaths(paths: HomeExplorePathV0[], size: number): HomeExplorePathV0[][] {
  if (!paths.length || size < 1) return [];
  const chunks: HomeExplorePathV0[][] = [];
  for (let i = 0; i < paths.length; i += size) {
    const slice = paths.slice(i, i + size);
    if (slice.length) chunks.push(slice);
  }
  // If the last chunk is short, leave it — still valid navigation.
  return chunks;
}

function prefetchTarget(href: string): string {
  // Overlay/compare URLs keep their query string; hash is never needed for RSC prefetch.
  return String(href || "").split("#")[0].trim();
}

/** Warm public CDN chart sidecars for compare chips (groups/tickers; themes are Tier B). */
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
    // Theme Tier B needs auth cookie path — skip warm from homepage to avoid noise.
    if (parsed.kind === "theme") continue;
    const key = `${parsed.kind}:${parsed.slug}`;
    if (warmed.has(key)) continue;
    warmed.add(key);
    void fetchChartSidecar(parsed.kind, parsed.slug, undefined, { live: true });
  }
}

export function HomeExplorePaths({
  paths,
  rotateSeconds = 10,
  visibleCount = DEFAULT_VISIBLE,
}: Props) {
  const router = useRouter();
  const cleaned = useMemo(
    () =>
      paths.filter(
        (p) =>
          p &&
          typeof p.label === "string" &&
          p.label.trim() &&
          typeof p.href === "string" &&
          p.href.startsWith("/"),
      ),
    [paths],
  );

  const visible = Math.max(1, visibleCount || DEFAULT_VISIBLE);
  const chunks = useMemo(() => chunkPaths(cleaned, visible), [cleaned, visible]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fading, setFading] = useState(false);
  const impressedRef = useRef<Set<string>>(new Set());
  const prefetchedRef = useRef<Set<string>>(new Set());
  // Slightly snappier than the published default so rotation is obvious on first visit.
  const rotateMs = Math.max(5, Math.min(rotateSeconds || 8, 12)) * 1000 || DEFAULT_ROTATE_MS;

  useEffect(() => {
    setIndex(0);
  }, [chunks.length]);

  const active = chunks[index] ?? chunks[0] ?? [];

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

  // Prefetch the visible set + next rotation (mobile has no hover). Cap keeps homepage light.
  useEffect(() => {
    if (typeof window === "undefined" || !chunks.length) return;
    const next = chunks[(index + 1) % chunks.length] ?? [];
    const batch = [...active, ...next];
    for (const p of batch) {
      const href = prefetchTarget(p.href);
      if (!href) continue;
      if (!prefetchedRef.current.has(href)) {
        prefetchedRef.current.add(href);
        void router.prefetch(href);
      }
      prefetchOverlaySidecars(href, prefetchedRef.current);
    }
  }, [active, chunks, index, router]);

  useEffect(() => {
    if (paused || chunks.length <= 1 || typeof window === "undefined") return;
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
  }, [paused, chunks.length, rotateMs]);

  if (!cleaned.length || !active.length) {
    return null;
  }

  return (
    <div className={styles.strip}>
      <span className={styles.label}>Trending themes</span>
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
          <Link
            key={`${index}-${p.id}`}
            href={p.href}
            prefetch={false}
            className={`${styles.chip}${fading ? ` ${styles.chipExit}` : ""}`}
            onMouseEnter={() => {
              const href = prefetchTarget(p.href);
              if (!href || prefetchedRef.current.has(href)) return;
              prefetchedRef.current.add(href);
              void router.prefetch(href);
            }}
            onClick={() => {
              capturePostHog("home_path_chip_clicked", {
                path_id: p.id,
                path_kind: p.kind,
                href: p.href,
                label: p.label,
                source: p.source ?? null,
              });
            }}
          >
            {p.label}
          </Link>
        ))}
      </div>
      {chunks.length > 1 ? (
        <div className={styles.dots} aria-hidden>
          {chunks.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.dot}${i === index ? ` ${styles.dotActive}` : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Show explore set ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
