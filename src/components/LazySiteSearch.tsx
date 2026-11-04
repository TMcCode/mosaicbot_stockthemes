"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

import styles from "./SiteSearch.module.css";

type LazySiteSearchProps = {
  placeholder?: string;
  variant?: "nav" | "hero";
};

type SiteSearchProps = {
  placeholder?: string;
  variant?: "nav" | "hero";
  autoFocus?: boolean;
};

type SiteSearchComp = ComponentType<SiteSearchProps>;

let cachedSiteSearch: SiteSearchComp | null = null;
let siteSearchLoad: Promise<SiteSearchComp> | null = null;

function loadSiteSearch(): Promise<SiteSearchComp> {
  if (cachedSiteSearch) return Promise.resolve(cachedSiteSearch);
  if (!siteSearchLoad) {
    siteSearchLoad = import("@/components/SiteSearch").then((m) => {
      cachedSiteSearch = m.SiteSearch;
      return cachedSiteSearch;
    });
  }
  return siteSearchLoad;
}

function SearchStub({
  placeholder,
  variant,
  onActivate,
}: {
  placeholder: string;
  variant: "nav" | "hero";
  onActivate: () => void;
}) {
  const wrapClass = variant === "hero" ? `${styles.wrap} ${styles.wrapHero}` : styles.wrap;
  const inputClass = variant === "hero" ? `${styles.input} ${styles.inputHero}` : styles.input;

  return (
    <div className={wrapClass}>
      <input
        className={inputClass}
        type="search"
        placeholder={placeholder}
        readOnly
        onFocus={onActivate}
        onPointerDown={onActivate}
        aria-label="Open search"
      />
    </div>
  );
}

/**
 * Defers the SiteSearch chunk until idle / first intent.
 * Critical: keep the stub mounted until the real component is ready — swapping to an
 * empty dynamic slot on pointerdown lets the tap fall through onto Trending themes.
 */
export function LazySiteSearch({
  placeholder = "Search…",
  variant = "nav",
}: LazySiteSearchProps = {}) {
  const isProd = process.env.NODE_ENV === "production";
  const [Comp, setComp] = useState<SiteSearchComp | null>(() => cachedSiteSearch);
  const [autoFocus, setAutoFocus] = useState(false);
  const idleHandleRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reveal = (focus: boolean) => {
    if (focus) setAutoFocus(true);
    void loadSiteSearch().then((C) => {
      setComp(() => C);
    });
  };

  useEffect(() => {
    if (Comp) return;

    if (!isProd) {
      reveal(false);
      return;
    }

    const onIdle = () => reveal(false);
    if (typeof requestIdleCallback === "function") {
      idleHandleRef.current = requestIdleCallback(onIdle);
    } else {
      timeoutRef.current = setTimeout(onIdle, 1500);
    }
    return () => {
      if (idleHandleRef.current != null && typeof cancelIdleCallback === "function") {
        cancelIdleCallback(idleHandleRef.current);
      }
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once deferral
  }, [Comp, isProd]);

  if (Comp) {
    return <Comp placeholder={placeholder} variant={variant} autoFocus={autoFocus} />;
  }

  return (
    <SearchStub
      placeholder={placeholder}
      variant={variant}
      onActivate={() => reveal(true)}
    />
  );
}
