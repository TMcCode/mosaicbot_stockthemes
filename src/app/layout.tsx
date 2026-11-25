import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// import { AdSenseGlobalScript } from "@/components/AdSenseGlobalScript";
import { BackToTop } from "@/components/BackToTop";
import { NewsletterRuntimeProvider } from "@/components/NewsletterRuntimeProvider";
import { SiteFooterAsOf } from "@/components/SiteFooterAsOf";
import { SiteNav } from "@/components/SiteNav";
import { SupabaseAuthProvider } from "@/components/SupabaseAuthProvider";
import { WatchlistProvider } from "@/components/WatchlistProvider";
import { ThemeRoot } from "@/components/ThemeRoot";
import { openGraphImageAsset } from "@/lib/seoMetadata";
import { siteBaseUrl } from "@/lib/siteUrl";
import { STOCKTHEMES_PUBLIC_BASE_URL } from "@/lib/stockthemesStorageConfig";
import { STOCKTHEMES_DEFAULT_THEME, THEME_BOOT_SCRIPT } from "@/lib/themeStorage";

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
  /* Keeps iOS Safari top chrome solid dark instead of frosted over page glow. */
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#040506" },
    { media: "(prefers-color-scheme: light)", color: "#ebe9f2" },
    { color: STOCKTHEMES_DEFAULT_THEME === "light" ? "#ebe9f2" : "#040506" },
  ],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /** GitHub Pages is a static export: `/api/*` is not deployed; keep API signup off in CI. */
  const staticPagesBuild = process.env.STOCKTHEMES_STATIC_PAGES === "1";
  const beehiivApiConfigured =
    !staticPagesBuild &&
    Boolean(process.env.BEEHIIV_API_KEY?.trim() && process.env.BEEHIIV_PUBLICATION_ID?.trim());

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-theme={STOCKTHEMES_DEFAULT_THEME}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href={STOCKTHEMES_PUBLIC_BASE_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={STOCKTHEMES_PUBLIC_BASE_URL} />
      </head>
      <body>
        {/* beforeInteractive → injected in <head>; avoids React 19 raw <script> warning. */}
        <Script
          id="stockthemes-theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
        {/* <AdSenseGlobalScript /> */}
        <NewsletterRuntimeProvider beehiivApiConfigured={beehiivApiConfigured}>
          <SupabaseAuthProvider>
            <WatchlistProvider>
              <ThemeRoot>
                <BackToTop />
                <SiteNav />
                {children}
                {/* Manifest as_of only for footer — stream so light pages (docs) are not blocked. */}
                <SiteFooterAsOf />
              </ThemeRoot>
            </WatchlistProvider>
          </SupabaseAuthProvider>
        </NewsletterRuntimeProvider>
      </body>
    </html>
  );
}
