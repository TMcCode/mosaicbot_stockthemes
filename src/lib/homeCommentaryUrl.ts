import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";

const OBJECT = "home_commentary.v0.json";

export function homeCommentaryFetchUrl(): string | undefined {
  const base = stockthemesPublicDataBase();
  if (!base) return undefined;
  return `${base}/${OBJECT}`;
}

export function homeCommentaryCacheRel(): string {
  return OBJECT;
}
