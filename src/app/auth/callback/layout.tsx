import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/seoMetadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Confirming sign-in",
    description:
      "OAuth/magic-link callback that completes authentication and redirects to your stockthemes.ai watchlist.",
    path: "/auth/callback",
  }),
  robots: { index: false, follow: false },
};

export default function AuthCallbackLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
