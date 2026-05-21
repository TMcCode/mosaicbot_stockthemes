import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/seoMetadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Account",
    description: "Your stockthemes.ai account — email, sign out, and delete account.",
    path: "/account",
  }),
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
