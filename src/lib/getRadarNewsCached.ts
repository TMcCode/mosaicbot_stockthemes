import { cache } from "react";

import { loadRadarNews } from "@/lib/loadRadarNews";

export const getRadarNewsCached = cache(async () => loadRadarNews());
