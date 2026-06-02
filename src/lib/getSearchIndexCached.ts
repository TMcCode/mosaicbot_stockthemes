import { cache } from "react";

import { loadSearchIndex, type SearchIndexLoadResult } from "@/lib/loadSearchIndex";

/** One fetch per request when multiple RSCs need the search index. */
export const getSearchIndexCached = cache(async (): Promise<SearchIndexLoadResult> => {
  return loadSearchIndex();
});
