import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { WebsiteContentV0 } from "@/types/website_content.v0";

function websiteContentFetchInit(): { cache: "no-store" } | { next: { revalidate: number } } {
  if (process.env.NODE_ENV === "development" && process.env.STOCKTHEMES_DEV_NO_STORE === "1") {
    return { cache: "no-store" };
  }
  return { next: { revalidate: 300 } };
}

function parseWebsiteContent(raw: string): WebsiteContentV0 {
  const data = JSON.parse(raw) as WebsiteContentV0;
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported website_content schema_version: ${data.schema_version}`);
  }
  if (!data.as_of) {
    throw new Error("Invalid website_content JSON: missing as_of");
  }
  return data;
}

export async function loadWebsiteContent(): Promise<WebsiteContentV0 | null> {
  const base = stockthemesPublicDataBase();
  if (!base) {
    return null;
  }
  const url = `${base}/website_content.v0.json`;
  const res = await fetch(url, websiteContentFetchInit());
  if (!res.ok) {
    return null;
  }
  return parseWebsiteContent(await res.text());
}
