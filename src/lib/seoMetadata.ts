import type { Metadata } from "next";

import { siteBaseUrl } from "@/lib/siteUrl";

function toAbsolute(path: string): string {
  const base = siteBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

type BuildPageMetadataArgs = {
  title: string;
  description: string;
  path: string;
};

export function buildPageMetadata({ title, description, path }: BuildPageMetadataArgs): Metadata {
  const url = toAbsolute(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "stockthemes.ai",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function absoluteUrl(path: string): string {
  return toAbsolute(path);
}
