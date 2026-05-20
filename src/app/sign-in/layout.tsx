import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/seoMetadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Sign in or create account",
    description:
      "Add email to curate stockthemes.ai — free account with up to 20 theme slots and 20 ticker slots — magic-link sign-in, no password.",
    path: "/sign-in",
  }),
  robots: { index: false, follow: false },
};

export default function SignInLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
