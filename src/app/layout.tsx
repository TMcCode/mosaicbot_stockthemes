import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// import { AdSenseGlobalScript } from "@/components/AdSenseGlobalScript";
import { NewsletterRuntimeProvider } from "@/components/NewsletterRuntimeProvider";
import { SignupGiveawayBanner } from "@/components/SignupGiveawayBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { SupabaseAuthProvider } from "@/components/SupabaseAuthProvider";
import { WatchlistProvider } from "@/components/WatchlistProvider";
import { ThemeRoot } from "@/components/ThemeRoot";
import { themeInitScriptContent } from "@/lib/themeStorage";
import { getManifestCached } from "@/lib/getManifestCached";
import { openGraphImageAsset } from "@/lib/seoMetadata";
import { siteBaseUrl } from "@/lib/siteUrl";
import { STOCKTHEMES_PUBLIC_BASE_URL } from "@/lib/stockthemesStorageConfig";

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
      <head>
        <link rel="preconnect" href={STOCKTHEMES_PUBLIC_BASE_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={STOCKTHEMES_PUBLIC_BASE_URL} />
      </head>
      <body>
        <Script
          id="stockthemes-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScriptContent() }}
        />
        {/* <AdSenseGlobalScript /> */}
        <NewsletterRuntimeProvider beehiivApiConfigured={beehiivApiConfigured}>
          <SupabaseAuthProvider>
            <WatchlistProvider>
              <ThemeRoot>
                <SiteNav />
                <SignupGiveawayBanner />
                {children}
                <SiteFooter dataAsOf={manifest.as_of} />
              </ThemeRoot>
            </WatchlistProvider>
          </SupabaseAuthProvider>
        </NewsletterRuntimeProvider>
      </body>
    </html>
  );
}
