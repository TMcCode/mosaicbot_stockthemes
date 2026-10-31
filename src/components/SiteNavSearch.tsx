"use client";

import { usePathname } from "next/navigation";

import { LazySiteSearch } from "@/components/LazySiteSearch";

import styles from "./SiteNav.module.css";

function isHomePath(pathname: string | null): boolean {
  const p = (pathname || "/").replace(/\/+$/, "") || "/";
  return p === "/";
}

/**
 * Nav search — on `/` keep the flex slot so brand / Browse spacing matches other
 * pages, but omit the input (hero search is primary there).
 */
export function SiteNavSearch() {
  const pathname = usePathname();
  if (isHomePath(pathname)) {
    return <div className={styles.searchSlot} aria-hidden />;
  }

  return (
    <div className={styles.searchSlot}>
      <LazySiteSearch />
    </div>
  );
}
