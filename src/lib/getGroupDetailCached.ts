import { cache } from "react";

import { loadGroupDetail, type GroupDetailLoadResult } from "@/lib/loadGroupDetail";

export const getGroupDetailCached = cache(
  async (slug: string): Promise<GroupDetailLoadResult | null> => {
    return loadGroupDetail(slug);
  },
);
