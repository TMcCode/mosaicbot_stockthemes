import { LazySiteSearch } from "@/components/LazySiteSearch";

import styles from "./SiteNav.module.css";

export function SiteNavSearch() {
  return (
    <div className={styles.searchSlot}>
      <LazySiteSearch />
    </div>
  );
}
