import { readFile } from "fs/promises";
import path from "path";

import { newsletterPostsCacheRel, newsletterPostsFetchUrl } from "@/lib/newsletterPostsUrl";
import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import type { NewsletterPostsV0 } from "@/types/newsletter_posts.v0";

const FIXTURE_REL = path.join("public", "fixtures", "newsletter_posts.v0.json");

function parseNewsletterPosts(raw: string): NewsletterPostsV0 {
  const data = parseJsonPayload<NewsletterPostsV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported newsletter_posts schema_version: ${data.schema_version}`);
  }
  if (!Array.isArray(data.posts)) {
    throw new Error("Invalid newsletter_posts JSON: missing posts array");
  }
  return data;
}

export type NewsletterPostsLoadResult = {
  bundle: NewsletterPostsV0;
  source: "live" | "fixture";
};

export async function loadNewsletterPosts(): Promise<NewsletterPostsLoadResult | null> {
  const url = newsletterPostsFetchUrl();
  if (url) {
    try {
      const raw = await fetchPublicJsonText(url, newsletterPostsCacheRel());
      return { bundle: parseNewsletterPosts(raw), source: "live" };
    } catch {
      // fall through to fixture
    }
  }
  try {
    const abs = path.join(process.cwd(), FIXTURE_REL);
    const raw = await readFile(abs, "utf-8");
    return { bundle: parseNewsletterPosts(raw), source: "fixture" };
  } catch {
    return null;
  }
}
