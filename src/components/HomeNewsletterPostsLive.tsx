"use client";

import { useEffect, useState } from "react";

import { HomeNewsletterPosts } from "@/components/HomeNewsletterPosts";
import { stockthemesBrowserSidecarFetchBase } from "@/lib/stockthemesPublicBase";
import type { NewsletterPostV0, NewsletterPostsV0 } from "@/types/newsletter_posts.v0";

type Props = {
  posts: NewsletterPostV0[];
  maxCards?: number;
  showViewAll?: boolean;
  showHeading?: boolean;
};

function parsePosts(raw: unknown): NewsletterPostV0[] | null {
  const data = raw as NewsletterPostsV0;
  if (!data || data.schema_version !== 0 || !Array.isArray(data.posts)) return null;
  return data.posts.length > 0 ? data.posts : null;
}

/**
 * SSR posts from build cache, then one client fetch of `newsletter_posts.v0.json`
 * so a scheduled bake → R2 can refresh From the desk without a Pages redeploy.
 */
export function HomeNewsletterPostsLive({
  posts,
  maxCards,
  showViewAll,
  showHeading,
}: Props) {
  const [livePosts, setLivePosts] = useState(posts);

  useEffect(() => {
    const base = stockthemesBrowserSidecarFetchBase();
    if (!base) return;
    const url = `${base.replace(/\/$/, "")}/newsletter_posts.v0.json`;
    let cancelled = false;
    void fetch(url, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        if (cancelled) return;
        const next = parsePosts(raw);
        if (next) setLivePosts(next);
      })
      .catch(() => {
        /* keep SSR posts */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <HomeNewsletterPosts
      posts={livePosts}
      maxCards={maxCards}
      showViewAll={showViewAll}
      showHeading={showHeading}
    />
  );
}
