"use client";

import dynamic from "next/dynamic";

import type { ComponentProps } from "react";

type Props = ComponentProps<
  typeof import("@/components/HomeCommentaryPreview").HomeCommentaryPreview
>;

const HomeCommentaryPreviewDynamic = dynamic(
  () =>
    import("@/components/HomeCommentaryPreview").then((m) => m.HomeCommentaryPreview),
  {
    loading: () => (
      <section aria-busy="true" aria-label="Loading commentary" style={{ minHeight: 120 }} />
    ),
  },
);

/** Code-split commentary preview off the main home client chunk. */
export function LazyHomeCommentaryPreview(props: Props) {
  return <HomeCommentaryPreviewDynamic {...props} />;
}
