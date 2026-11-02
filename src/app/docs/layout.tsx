import type { ReactNode } from "react";

import { DocsSidebar } from "@/components/DocsSidebar";
import { PageSurface } from "@/components/PageSurface";

import styles from "./docs.module.css";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <PageSurface className={styles.docsSurface}>
      <div className={styles.frame}>
        <DocsSidebar />
        <div className={styles.contentPane}>{children}</div>
      </div>
    </PageSurface>
  );
}
