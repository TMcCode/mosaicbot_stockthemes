import { cache } from "react";

import { loadWebsiteContent } from "@/lib/loadWebsiteContent";

/** One website_content fetch per request when multiple RSCs need static copy. */
export const getWebsiteContentCached = cache(async () => {
  return loadWebsiteContent();
});
