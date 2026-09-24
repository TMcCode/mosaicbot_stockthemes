import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";

const OBJECT = "newsletter_posts.v0.json";

export function newsletterPostsFetchUrl(): string | undefined {
  const base = stockthemesPublicDataBase();
  if (!base) return undefined;
  return `${base}/${OBJECT}`;
}

export function newsletterPostsCacheRel(): string {
  return OBJECT;
}
