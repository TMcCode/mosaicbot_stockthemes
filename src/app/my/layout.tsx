import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/seoMetadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "My watchlist",
    description: "Your signed-in stockthemes.ai themes and ticker watchlist (free).",
    path: "/my",
  }),
  robots: { index: false, follow: false },
};

export default function MyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
