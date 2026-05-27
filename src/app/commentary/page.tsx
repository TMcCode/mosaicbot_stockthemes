import Link from "next/link";
import type { Metadata } from "next";

import { CommentaryListLive } from "@/components/CommentaryListLive";
import { loadHomeCommentary } from "@/lib/loadHomeCommentary";
import { buildPageMetadata } from "@/lib/seoMetadata";

import styles from "./page.module.css";

import { PageSurface } from "@/components/PageSurface";

export const metadata: Metadata = buildPageMetadata({
  title: "Market commentary",
  description: "Recent market and theme commentary from the stockthemes team.",
  path: "/commentary",
});

export default async function CommentaryPage() {
  const loaded = await loadHomeCommentary();
  const items = loaded?.commentary.items ?? [];
  const listDays = loaded?.commentary.list_days ?? 90;

  return (
    <PageSurface>
      <main className={styles.main}>
        <p className={styles.backLink}>
          <Link href="/">Back to home</Link>
        </p>
        <h1>Market commentary</h1>
        <CommentaryListLive initialItems={items} initialListDays={listDays} />
      </main>
    </PageSurface>
  );
}
