import type { MetadataRoute } from "next";

import { siteBaseUrl } from "@/lib/siteUrl";

/** Required for `output: "export"`. */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
