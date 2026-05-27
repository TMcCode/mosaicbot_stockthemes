import { HELLO_EMAIL } from "@/lib/contactEmails";
import { homeSiteJsonDescription } from "@/lib/homeSiteCopy";
import { siteBaseUrl } from "@/lib/siteUrl";

export function buildHomePageJsonLd(extraDescription?: string): Record<string, unknown> {
  const url = siteBaseUrl();
  const description = extraDescription?.trim() || homeSiteJsonDescription();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "stockthemes.ai",
        url,
        description,
        inLanguage: "en-US",
        publisher: { "@id": `${url}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: "stockthemes.ai",
        url,
        description,
        email: HELLO_EMAIL,
      },
    ],
  };
}
