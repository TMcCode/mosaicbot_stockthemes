import Link from "next/link";
import type { Metadata } from "next";

import { HomeNewsletterPostsLive } from "@/components/HomeNewsletterPostsLive";
import { PageSurface } from "@/components/PageSurface";
import { loadNewsletterPosts } from "@/lib/loadNewsletterPosts";
import { buildPageMetadata } from "@/lib/seoMetadata";

import styles from "../page.module.css";
import deskStyles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "From the desk",
  description:
    "Field of Themes and Alt Data Observer notes — thesis context and alternative-data signals.",
  path: "/desk",
});

export default async function DeskPage() {
  const loaded = await loadNewsletterPosts();
  const posts = loaded?.bundle?.posts ?? [];

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={`${styles.intro} ${deskStyles.intro}`}>
          <p className={styles.eyebrow}>
            <Link href="/">← Home</Link>
          </p>
          <h1 className={styles.heroTitle}>From the desk</h1>
          <p className={styles.introPunchline}>
            Field of Themes and Alt Data Observer — open any note on its publisher site.
          </p>

          <HomeNewsletterPostsLive
            posts={posts}
            maxCards={40}
            showViewAll={false}
            showHeading={false}
          />
        </div>
      </main>
    </PageSurface>
  );
}
