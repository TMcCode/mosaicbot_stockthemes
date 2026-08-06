import Link from "next/link";
import type { Metadata } from "next";

import styles from "./page.module.css";
import { PageSurface } from "@/components/PageSurface";
import { ThemeSlugRedirectOn404 } from "@/components/ThemeSlugRedirectOn404";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page is not in the stockthemes index.",
};

export default function NotFound() {
  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>404</p>
          <h1>Page not found</h1>
          <p>That URL is not in this build of the index. Try home, groups, or themes.</p>
          <ThemeSlugRedirectOn404 />
          <div className={styles.ctas}>
            <Link className={styles.primary} href="/">
              Home
            </Link>
            <Link className={styles.secondary} href="/groups">
              All groups
            </Link>
          </div>
        </div>
      </main>
    </PageSurface>
  );
}
