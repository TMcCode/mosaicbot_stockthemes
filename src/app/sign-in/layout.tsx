import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/seoMetadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Sign in or create account",
    description:
      "Sign in or create a free stockthemes.ai account with Google, GitHub, or a magic email link — curate up to 20 themes.",
    path: "/sign-in",
  }),
  robots: { index: false, follow: false },
};

export default function SignInLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
