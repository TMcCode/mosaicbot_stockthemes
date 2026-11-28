"use client";

import { useEffect } from "react";

import { SiteSearch } from "@/components/SiteSearch";
import { loadSearchIndexBrowser } from "@/lib/searchIndexBrowser";

type HeroSiteSearchProps = {
  placeholder?: string;
};

/**
 * Homepage hero search — must be a real input on first tap.
 * LazySiteSearch’s readonly stub → async chunk swap drops the mobile
 * user-gesture, so autofocus shows “Loading search…” without a keyboard.
 */
export function HeroSiteSearch({
  placeholder = "e.g. NVDA, robotics, data centers…",
}: HeroSiteSearchProps) {
  useEffect(() => {
    void loadSearchIndexBrowser().catch(() => {});
  }, []);

  return <SiteSearch variant="hero" placeholder={placeholder} />;
}
