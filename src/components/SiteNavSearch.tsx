"use client";

import { usePathname } from "next/navigation";

import { LazySiteSearch } from "@/components/LazySiteSearch";

import styles from "./SiteNav.module.css";

/** Hide nav search on mobile home — hero search already covers it. */
export function SiteNavSearch() {
  const pathname = usePathname();
  const hideOnMobileHome = pathname === "/";

  return (
    <div className={hideOnMobileHome ? styles.searchHideMobileHome : undefined}>
      <LazySiteSearch />
    </div>
  );
}
