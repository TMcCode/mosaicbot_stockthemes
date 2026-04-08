import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AdSenseGlobalScript } from "@/components/AdSenseGlobalScript";
import { NewsletterRuntimeProvider } from "@/components/NewsletterRuntimeProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { ThemeRoot } from "@/components/ThemeRoot";
import { getManifestCached } from "@/lib/getManifestCached";
import { openGraphImageAsset } from "@/lib/seoMetadata";
import { siteBaseUrl } from "@/lib/siteUrl";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_TAGLINE =
  "Thematic equity intelligence—explore stock market themes, groups, and holdings with fresh public data.";

export const metadata: Metadata = {
  metadataBase: new URL(siteBaseUrl()),
  title: {
    default: "stockthemes.ai",
    template: "%s · stockthemes.ai",
  },
  description: SITE_TAGLINE,
  applicationName: "stockthemes.ai",
  openGraph: {
    title: "stockthemes.ai",
    description: SITE_TAGLINE,
    url: siteBaseUrl(),
    siteName: "stockthemes.ai",
    locale: "en_US",
    type: "website",
    images: [openGraphImageAsset()],
  },
  twitter: {
    card: "summary_large_image",
    title: "stockthemes.ai",
    description: SITE_TAGLINE,
    images: [openGraphImageAsset().url],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /** GitHub Pages is a static export: `/api/*` is not deployed; keep API signup off in CI. */
  const staticPagesBuild = process.env.STOCKTHEMES_STATIC_PAGES === "1";
  const beehiivApiConfigured =
    !staticPagesBuild &&
    Boolean(process.env.BEEHIIV_API_KEY?.trim() && process.env.BEEHIIV_PUBLICATION_ID?.trim());

  const { manifest } = await getManifestCached();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <AdSenseGlobalScript />
        <NewsletterRuntimeProvider beehiivApiConfigured={beehiivApiConfigured}>
          <ThemeRoot>
            <SiteNav />
            {children}
            <SiteFooter dataAsOf={manifest.as_of} />
          </ThemeRoot>
        </NewsletterRuntimeProvider>
      </body>
    </html>
  );
}
