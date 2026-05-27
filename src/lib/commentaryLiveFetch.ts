import {
  commentaryBrowserCacheBusterQuery,
  commentaryBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { homeCommentaryFetchUrl } from "@/lib/homeCommentaryUrl";
import type { HomeCommentaryV0 } from "@/types/home_commentary.v0";

/** Commentary uses a short client refresh window even when global live hydrate is off. */
export function stockthemesCommentaryLiveEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_STOCKTHEMES_COMMENTARY_LIVE?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") {
    return false;
  }
  return Boolean(homeCommentaryFetchUrl());
}

export async function fetchHomeCommentaryLive(): Promise<HomeCommentaryV0 | null> {
  const url = homeCommentaryFetchUrl();
  if (!url || !stockthemesCommentaryLiveEnabled()) {
    return null;
  }
  const fullUrl = `${url}?${commentaryBrowserCacheBusterQuery()}`;
  const res = await fetch(fullUrl, {
    credentials: "omit",
    cache: commentaryBrowserFetchCache(),
  });
  if (!res.ok) {
    throw new Error(String(res.status));
  }
  const data = (await res.json()) as HomeCommentaryV0;
  if (data.schema_version !== 0 || !Array.isArray(data.items)) {
    throw new Error("Invalid home_commentary JSON");
  }
  return data;
}
