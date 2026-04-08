import type { Metadata } from "next";

import { siteBaseUrl } from "@/lib/siteUrl";

function toAbsolute(path: string): string {
  const base = siteBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

/** 1200×630 asset at /og.png (see scripts/generate-og-png.mjs). Absolute URL for correct previews with subpath deploys. */
export function openGraphImageAsset(): { url: string; width: number; height: number; alt: string } {
  return {
    url: toAbsolute("/og.png"),
    width: 1200,
    height: 630,
    alt: "stockthemes.ai — full logo",
  };
}

type BuildPageMetadataArgs = {
  title: string;
  description: string;
  path: string;
};

export function buildPageMetadata({ title, description, path }: BuildPageMetadataArgs): Metadata {
  const url = toAbsolute(path);
  const ogImage = openGraphImageAsset();
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
      locale: "en_US",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.url],
    },
  };
}

export function absoluteUrl(path: string): string {
  return toAbsolute(path);
}
