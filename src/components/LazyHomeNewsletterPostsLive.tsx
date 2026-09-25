"use client";

import dynamic from "next/dynamic";

import type { ComponentProps } from "react";

type Props = ComponentProps<
  typeof import("@/components/HomeNewsletterPostsLive").HomeNewsletterPostsLive
>;

const HomeNewsletterPostsLiveDynamic = dynamic(
  () =>
    import("@/components/HomeNewsletterPostsLive").then((m) => m.HomeNewsletterPostsLive),
  {
    loading: () => (
      <section aria-busy="true" aria-label="Loading newsletter" style={{ minHeight: 160 }} />
    ),
  },
);

/** Code-split newsletter block off the main home client chunk. */
export function LazyHomeNewsletterPostsLive(props: Props) {
  return <HomeNewsletterPostsLiveDynamic {...props} />;
}
