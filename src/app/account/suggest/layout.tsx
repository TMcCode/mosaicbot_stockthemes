import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/seoMetadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Suggest a group or theme",
    description: "Submit a new theme group or theme idea to stockthemes.ai.",
    path: "/account/suggest",
  }),
  robots: { index: false, follow: false },
};

export default function SuggestLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
